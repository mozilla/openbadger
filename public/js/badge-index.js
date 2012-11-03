(function ($) {
  console.log('loaded');
  var $forms = $('.js-remove-behavior');
  var $links = $forms.find('.js-show-remove');

  $links.on('click', function (e) {
    console.log('clicked');
    var $this = $(this);
    $this.siblings('.js-remove-button').show();
    $this.hide();
    return (e.preventDefault(), false);
  });

})(jQuery)