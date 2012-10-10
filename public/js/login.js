(function loginHandler () {
  var $form = $('.js-persona-form');
  var $input = $('.js-persona-input');
  var $loginLink = $('.js-persona-login');

  function launchBrowserId(callback) {
    return function() {
      navigator.id.get(callback, { siteName: 'OpenBadger' });
      return false;
    }
  }

  function handleResponse(assertion) {
    if (!assertion) return false;
    $input.val(assertion);
    $form.trigger('submit');
  }

  $loginLink.bind('click', launchBrowserId(handleResponse));
})();
