// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

import '@hotwired/turbo';
import { hideLoadingOverlay, showLoadingOverlay } from 'utils/loading-overlay';
import { reloadPage } from 'utils/turbolinks';

Turbo.config.drive.progressBarDelay = 0;

// loading animation overlay
document.addEventListener('turbo:visit', showLoadingOverlay);
document.addEventListener('turbo:before-cache', hideLoadingOverlay);
document.addEventListener('turbo:load', hideLoadingOverlay);
// only for forms handled by turbo. jquery-ujs forms are handled separately
document.addEventListener('turbo:submit-start', (e) => {
  if (e.detail.formSubmission.formElement.dataset.loadingOverlay !== '0') {
    showLoadingOverlay();
  }
});
document.addEventListener('turbo:submit-end', hideLoadingOverlay);
document.addEventListener('turbo:submit-end', (e) => {
  if (e.detail.success && e.detail.formSubmission.formElement.dataset.reloadOnSuccess === '1') {
    reloadPage();
  }
});

// disable turbo navigation for old webs
document.addEventListener('turbo:click', (event) => {
  const url = new URL(event.detail.url);

  if (
    url.origin === Turbo.session.navigator.rootLocation.origin
    && url.pathname.match(/^\/(?:(?:api|osu|p|ss|web)\/|(?:beatmapsets|scores(?:\/[^\d]+)?)\/\d+\/download(?:\?|$))/) === null
  ) {
    return;
  }

  event.preventDefault();
});
