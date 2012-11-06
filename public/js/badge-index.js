(function ($) {
  var $forms = $('.js-remove-behavior');
  var $links = $forms.find('.js-show-remove');
  var $cancel = $forms.find('.js-cancel-button');
  var $badgeDelete = $('.js-delete-badge')

  $links.on('click', function (e) {
    var $this = $(this);
    $this.parents('form').addClass('show-actions');
    return (e.preventDefault(), false);
  });

  $cancel.on('click', function (e) {
    var $this = $(this);
    $this.parents('form').removeClass('show-actions');
    return (e.preventDefault(), false);
  });

  $badgeDelete.on('click', function (e) {
    var $this = $(this);
    var seriously = window.confirm('Seriously? This can\'t be undone');
    if (seriously)
      $this.parents('form').trigger('submit');
    return (e.preventDefault(), false);
  });

})(jQuery)