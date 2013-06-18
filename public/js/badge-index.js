(function ($) {
  var csrfToken = $('meta[name="csrf"]').attr('content');
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
    var row = $this.closest("tr");
    var seriously = window.confirm('Seriously delete this badge?');
    if (seriously)
      $.ajax({
        url: this.href,
        type: 'DELETE',
        data: {csrf: csrfToken},
        success: function() { window.location.reload(); },
        error: function() { alert('Alas, an error occurred.'); }
      });
    return (e.preventDefault(), false);
  });
})(jQuery)