(function ($) {
  var $forms = $('.js-claim-action');
  var $buttons = $forms.find('button');
  $buttons.on('click', function () {
    var $this = $(this);
    var $form = $this.parent('form');
    var $method = $form.find('.js-claim-action-method');
    $method.val($this.data('method'));
    return true;
  });
})(jQuery)