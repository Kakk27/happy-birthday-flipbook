(function(window){
  'use strict';

  var SLOT_ASPECTS = {
    'page3': 3 / 4,
    'letter': 100 / 47.4,
    'p4a': 56 / 35,
    'p4b': 56 / 35,
    'p4s1': 18 / 24.5,
    'p4s2': 18 / 24.5,
    'p4s3': 18 / 24.5,
    'p4s4': 18 / 24.5,
    'p5a': 57 / 54,
    'p5b': 57 / 54,
    'p7a': 34 / 22,
    'p7b': 28 / 27,
    'p7c': 26 / 25,
    'p7d': 27 / 26,
    'p7e': 31 / 27,
    'p7f': 20 / 29,
    'p8a': 81.6 / 41.5,
    'p8b': 81.6 / 41.5,
    'p9a': 40.6 / 64.6,
    'p9b': 34 / 23,
    'p9c': 40 / 24,
    'n1': 41 / 30,
    'n2': 41 / 32,
    'n3': 27 / 28,
    'n4': 31 / 26,
    'n5': 22 / 28
  };

  var modal = null,
      backdrop = null,
      dialog = null,
      closeBtn = null,
      cancelBtn = null,
      saveBtn = null,
      saveText = null,
      saveSpinner = null,
      stage = null,
      viewport = null,
      imgEl = null,
      zoomIn = null,
      rotateBtn = null,
      flipBtn = null,
      resetBtn = null,
      subTitle = null;

  var currentImg = null;
  var imgGhostEl = null;
  var currentCb = null;
  var currentCancelCb = null;
  var targetAspect = 1;

  // Transform state
  var baseScale = 1;
  var userScale = 1;
  var posX = 0;
  var posY = 0;
  var rotation = 0;
  var flipH = 1;
  var vpW = 280;
  var vpH = 280;

  // Drag tracking
  var isDragging = false;
  var startPointerX = 0;
  var startPointerY = 0;
  var startPosX = 0;
  var startPosY = 0;
  var activePointers = {};
  var initialPinchDist = 0;
  var initialPinchScale = 1;

  function initElements(){
    if(modal) return;
    modal = document.getElementById('cropModal');
    if(!modal) return;
    backdrop = document.getElementById('cropBackdrop');
    dialog = modal.querySelector('.crop-dialog');
    closeBtn = document.getElementById('cropClose');
    cancelBtn = document.getElementById('cropCancel');
    saveBtn = document.getElementById('cropSave');
    saveText = modal.querySelector('.crop-save-text');
    saveSpinner = modal.querySelector('.crop-save-spinner');
    stage = document.getElementById('cropStage');
    viewport = document.getElementById('cropViewport');
    imgEl = document.getElementById('cropImg');
    zoomIn = document.getElementById('cropZoom');
    rotateBtn = document.getElementById('cropRotate');
    flipBtn = document.getElementById('cropFlip');
    resetBtn = document.getElementById('cropReset');
    subTitle = document.getElementById('cropSlotName');

    // Create ghost image behind the frame in stage so full image is visible
    var ghost = document.getElementById('cropImgGhost');
    if(!ghost && stage){
      ghost = document.createElement('img');
      ghost.id = 'cropImgGhost';
      ghost.className = 'crop-img-ghost';
      ghost.alt = '';
      stage.insertBefore(ghost, viewport);
    }
    imgGhostEl = ghost;

    // Add four corner bracket markers inside viewport
    if(viewport && !viewport.querySelector('.crop-corner')){
      ['tl', 'tr', 'bl', 'br'].forEach(function(c){
        var corner = document.createElement('div');
        corner.className = 'crop-corner ' + c;
        viewport.appendChild(corner);
      });
    }

    if(closeBtn) closeBtn.addEventListener('click', close);
    if(cancelBtn) cancelBtn.addEventListener('click', close);
    if(backdrop) backdrop.addEventListener('click', close);

    if(zoomIn){
      zoomIn.addEventListener('input', function(){
        userScale = parseFloat(zoomIn.value) || 1;
        applyTransform();
      });
    }

    if(rotateBtn){
      rotateBtn.addEventListener('click', function(){
        rotation = (rotation + 90) % 360;
        recalculateBase();
        applyTransform();
      });
    }

    if(flipBtn){
      flipBtn.addEventListener('click', function(){
        flipH *= -1;
        applyTransform();
      });
    }

    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        userScale = 1;
        if(zoomIn) zoomIn.value = '1';
        rotation = 0;
        flipH = 1;
        posX = 0;
        posY = 0;
        recalculateBase();
        applyTransform();
      });
    }

    if(viewport){
      viewport.addEventListener('pointerdown', onPointerDown);
      viewport.addEventListener('pointermove', onPointerMove);
      viewport.addEventListener('pointerup', onPointerUp);
      viewport.addEventListener('pointercancel', onPointerUp);
      viewport.addEventListener('wheel', onWheel, { passive: false });
    }

    if(stage){
      stage.addEventListener('pointerdown', onPointerDown);
      stage.addEventListener('pointermove', onPointerMove);
      stage.addEventListener('pointerup', onPointerUp);
      stage.addEventListener('pointercancel', onPointerUp);
      stage.addEventListener('wheel', onWheel, { passive: false });
    }

    if(saveBtn){
      saveBtn.addEventListener('click', onSave);
    }

    window.addEventListener('resize', function(){
      if(modal && !modal.hidden && currentImg){
        setupViewportDimensions(targetAspect);
        recalculateBase();
        applyTransform();
      }
    });
  }

  function onPointerDown(e){
    if(e.button !== 0 && e.pointerType === 'mouse') return;
    activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(activePointers);
    if(keys.length === 1){
      isDragging = true;
      viewport.classList.add('dragging');
      viewport.setPointerCapture(e.pointerId);
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      startPosX = posX;
      startPosY = posY;
    } else if(keys.length === 2){
      // Start pinch
      isDragging = false;
      viewport.classList.remove('dragging');
      var p1 = activePointers[keys[0]];
      var p2 = activePointers[keys[1]];
      initialPinchDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      initialPinchScale = userScale;
    }
  }

  function onPointerMove(e){
    if(!activePointers[e.pointerId]) return;
    activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(activePointers);
    if(keys.length === 1 && isDragging){
      var dx = e.clientX - startPointerX;
      var dy = e.clientY - startPointerY;
      posX = startPosX + dx;
      posY = startPosY + dy;
      applyTransform();
    } else if(keys.length >= 2){
      var p1 = activePointers[keys[0]];
      var p2 = activePointers[keys[1]];
      var currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if(initialPinchDist > 0){
        var factor = currentDist / initialPinchDist;
        userScale = Math.min(3, Math.max(1, initialPinchScale * factor));
        if(zoomIn) zoomIn.value = String(userScale);
        applyTransform();
      }
    }
  }

  function onPointerUp(e){
    delete activePointers[e.pointerId];
    if(Object.keys(activePointers).length === 0){
      isDragging = false;
      if(viewport){
        viewport.classList.remove('dragging');
        try{ viewport.releasePointerCapture(e.pointerId); }catch(err){}
      }
    }
  }

  function onWheel(e){
    e.preventDefault();
    var delta = e.deltaY < 0 ? 0.08 : -0.08;
    userScale = Math.min(3, Math.max(1, userScale + delta));
    if(zoomIn) zoomIn.value = String(userScale);
    applyTransform();
  }

  function recalculateBase(){
    if(!currentImg) return;
    var nw = currentImg.naturalWidth || 800;
    var nh = currentImg.naturalHeight || 600;
    var isRot90 = (rotation % 180 !== 0);
    var effW = isRot90 ? nh : nw;
    var effH = isRot90 ? nw : nh;

    // Scale to cover viewport (like object-fit: cover)
    var scaleX = vpW / effW;
    var scaleY = vpH / effH;
    baseScale = Math.max(scaleX, scaleY);
  }

  function applyTransform(){
    if(!imgEl || !currentImg) return;
    var nw = currentImg.naturalWidth;
    var nh = currentImg.naturalHeight;

    // Center image in viewport
    var totalScale = baseScale * userScale;
    var centerX = (vpW - nw) / 2 + posX;
    var centerY = (vpH - nh) / 2 + posY;

    var tf = 'translate(' + centerX + 'px, ' + centerY + 'px) ' +
             'rotate(' + rotation + 'deg) ' +
             'scale(' + (totalScale * flipH) + ', ' + totalScale + ')';
    imgEl.style.transform = tf;

    if(imgGhostEl && stage){
      var offsetX = (stage.clientWidth - vpW) / 2;
      var offsetY = (stage.clientHeight - vpH) / 2;
      var ghostTf = 'translate(' + (offsetX + centerX) + 'px, ' + (offsetY + centerY) + 'px) ' +
                    'rotate(' + rotation + 'deg) ' +
                    'scale(' + (totalScale * flipH) + ', ' + totalScale + ')';
      imgGhostEl.style.transform = ghostTf;
    }
  }

  function setupViewportDimensions(aspect){
    if(!stage || !viewport) return;
    var rect = stage.getBoundingClientRect();
    var availW = rect.width > 80 ? rect.width : (window.innerWidth * 0.9);
    var availH = rect.height > 80 ? rect.height : (window.innerHeight * 0.6);

    // Provide a much larger, generous crop area for clear previewing
    var maxW = Math.min(820, Math.max(260, availW - 32));
    var maxH = Math.min(560, Math.max(240, availH - 32));

    if(aspect >= 1){
      vpW = maxW;
      vpH = Math.round(maxW / aspect);
      if(vpH > maxH){
        vpH = maxH;
        vpW = Math.round(maxH * aspect);
      }
    } else {
      vpH = maxH;
      vpW = Math.round(maxH * aspect);
      if(vpW > maxW){
        vpW = maxW;
        vpH = Math.round(maxW / aspect);
      }
    }

    vpW = Math.max(160, Math.round(vpW));
    vpH = Math.max(120, Math.round(vpH));

    viewport.style.width = vpW + 'px';
    viewport.style.height = vpH + 'px';
  }

  function open(options){
    initElements();
    if(!modal) return;

    var file = options.file;
    var slotId = options.slot || 'photo';
    currentCb = options.onCrop;
    currentCancelCb = options.onCancel;
    targetAspect = options.aspectRatio || SLOT_ASPECTS[slotId] || 1;

    if(subTitle){
      var readableSlot = slotId === 'letter' ? 'Page 5 Letter Photo' :
                         slotId === 'page3' ? 'Page 3 Main Photo' :
                         slotId.startsWith('p4s') ? 'Photo Strip Frame' :
                         slotId.startsWith('p5') ? 'Polaroid Frame' :
                         slotId.startsWith('p7') ? 'Memory Collage Frame' :
                         slotId.startsWith('p8') ? 'Dark Portrait Frame' :
                         slotId.startsWith('n') ? 'Navy Stargaze Frame' :
                         ('Photo Slot: ' + slotId);
      subTitle.textContent = readableSlot + ' • Drag to align or zoom';
    }

    // Check if HEIC conversion is needed
    var isHeic = file && (
      (file.name && (/\.(heic|heif)$/i).test(file.name)) ||
      (file.type && file.type.toLowerCase().indexOf('heic') !== -1)
    );

    if(isHeic && window.heic2any){
      if(subTitle) subTitle.textContent = 'Converting iPhone HEIC image…';
      window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
        .then(function(res){
          var blob = Array.isArray(res) ? res[0] : res;
          loadImageFromBlob(blob);
        })
        .catch(function(err){
          console.warn('[HEIC Client Fallback]', err);
          loadImageFromBlob(file);
        });
    } else {
      loadImageFromBlob(file);
    }
  }

  function loadImageFromBlob(blobOrFile){
    var fr = new FileReader();
    fr.onload = function(){
      var img = new Image();
      img.onload = function(){
        currentImg = img;
        imgEl.src = fr.result;
        imgEl.style.width = img.naturalWidth + 'px';
        imgEl.style.height = img.naturalHeight + 'px';

        if(imgGhostEl){
          imgGhostEl.src = fr.result;
          imgGhostEl.style.width = img.naturalWidth + 'px';
          imgGhostEl.style.height = img.naturalHeight + 'px';
        }

        modal.hidden = false;

        // Ensure DOM has rendered visible stage so getBoundingClientRect reflects true size
        requestAnimationFrame(function(){
          setupViewportDimensions(targetAspect);
          userScale = 1;
          if(zoomIn) zoomIn.value = '1';
          posX = 0;
          posY = 0;
          rotation = 0;
          flipH = 1;
          recalculateBase();
          applyTransform();
        });
      };
      img.onerror = function(){
        alert('Could not decode image format. Please select a JPEG or PNG file.');
        close();
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(blobOrFile);
  }

  function close(){
    if(modal) modal.hidden = true;
    if(currentCancelCb){
      currentCancelCb();
      currentCancelCb = null;
    }
    currentCb = null;
    currentImg = null;
    activePointers = {};
    if(saveBtn) saveBtn.disabled = false;
    if(saveText) saveText.textContent = 'Crop & Save';
    if(saveSpinner) saveSpinner.hidden = true;
  }

  function onSave(){
    if(!currentImg) return close();
    if(saveBtn) saveBtn.disabled = true;
    if(saveText) saveText.textContent = 'Compressing…';
    if(saveSpinner) saveSpinner.hidden = false;

    // Render cropped portion to high resolution canvas
    var outW = Math.min(1600, Math.max(900, Math.round(vpW * 3.5)));
    var outH = Math.round(outW / targetAspect);

    var canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Map viewport transform to canvas
    var scaleRatio = outW / vpW;
    ctx.scale(scaleRatio, scaleRatio);

    // Apply viewport transform
    var nw = currentImg.naturalWidth;
    var nh = currentImg.naturalHeight;
    var totalScale = baseScale * userScale;
    var centerX = (vpW - nw) / 2 + posX;
    var centerY = (vpH - nh) / 2 + posY;

    ctx.translate(centerX, centerY);
    ctx.translate(nw / 2, nh / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(totalScale * flipH, totalScale);
    ctx.translate(-nw / 2, -nh / 2);

    ctx.drawImage(currentImg, 0, 0);

    // Extract canvas as preview URL immediately
    var previewUrl = canvas.toDataURL('image/jpeg', 0.88);

    canvas.toBlob(function(rawBlob){
      if(!rawBlob){
        finishSave(null, previewUrl);
        return;
      }

      // Use browser-image-compression library if available
      if(window.imageCompression){
        var options = {
          maxSizeMB: 0.75,
          maxWidthOrHeight: 1400,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.85
        };

        window.imageCompression(rawBlob, options)
          .then(function(compressedFile){
            finishSave(compressedFile, previewUrl);
          })
          .catch(function(compErr){
            console.warn('[Compression Fallback]', compErr);
            finishSave(rawBlob, previewUrl);
          });
      } else {
        finishSave(rawBlob, previewUrl);
      }
    }, 'image/jpeg', 0.88);
  }

  function finishSave(blob, previewUrl){
    var cb = currentCb;
    close();
    if(cb){
      cb(blob, previewUrl);
    }
  }

  window.CropperModal = {
    init: initElements,
    open: open,
    close: close,
    SLOT_ASPECTS: SLOT_ASPECTS
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initElements);
  } else {
    initElements();
  }

})(window);
