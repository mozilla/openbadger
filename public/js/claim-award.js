(function claimAward($) {
  var $form = $('.js-confirm-form');
  var $emailInput = $form.find('.js-email-input');
  var where = $form.prop('action');
  var method = $form.prop('method');
  var code = $form.find('input[name="code"]').val();
  var csrfToken = $form.find('input[name="csrf"]').val();

  jQuery.ajaxSetup({
    headers: {'x-csrf-token': csrfToken}
  });

  function getAssertion(email, callback) {
    var data = { email: email, code: code};
    jQuery.post('/claim/confirm', data)
      .success(function (data) { callback(null, data) })
      .error(function (err) { callback(err.statusText) });
  }

  $form.on('submit', function (e) {
    var $this = $(this);
    var email = $emailInput.val().trim();
    var url;
    getAssertion(email, function (err, data) {
      if (err)
        return window.alert('there was an error trying to claim the badge :(');
      url = data.assertionUrl;
      OpenBadges.issue([url]);
    });

    return (e.preventDefault(), false);
  });
})(jQuery);