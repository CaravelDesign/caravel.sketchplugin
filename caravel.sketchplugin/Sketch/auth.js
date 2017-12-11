@import 'core/ui.js';
@import 'core/api.js';

var onRun = function(context) {
  if (api.getToken()) {
    ui.showLogoutWindow(context);
  } else {
    ui.showLoginWindow(context, false);
  }
}
