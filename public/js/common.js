(function logout($) {
  var link = $('.js-logout-link');
  var form = $('.js-logout-form');
  link.on('click', function (e) {
    form.submit();
    e.preventDefault();
    return false;
  });
})(jQuery);