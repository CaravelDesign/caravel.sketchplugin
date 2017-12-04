@import 'core/ui.js';
@import 'core/api.js';

var onRun = function(context) {
  api.setContext(context);
  if(api.getToken()) {
    ui.exportPages(context);
  } else {
    ui.showLoginWindow(context, true);
  }
}
