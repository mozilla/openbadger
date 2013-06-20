(function($) {
  var csrfToken = $('meta[name="csrf"]').attr('content');
  var link = $('.js-logout-link');
  var form = $('.js-logout-form');

  link.on('click', function (e) {
    form.submit();
    e.preventDefault();
    return false;
  });

  $(document.body).on('click', '.js-delete-item', function(e) {
    var $this = $(this);
    $.ajax({
      url: this.href,
      type: 'DELETE',
      data: {csrf: csrfToken},
      success: function() { window.location.reload(); },
      error: function() { alert('Alas, an error occurred.'); }
    });
    return (e.preventDefault(), false);    
  });
})(jQuery);