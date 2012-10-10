function slugify(string) {
  return string
    .toLowerCase()
    .replace(/[\s\-]+/g, '-')
    .replace(/[^a-z0-9_\-]/gi, '');
}
var $nameInput = $('#name');
var $shortnameInput = $('#shortname');

$nameInput.on('keyup', function(event) {
  var nameValue = $nameInput.val().trim();
  var shortname = slugify(nameValue);
  $shortnameInput.val(shortname);
});
