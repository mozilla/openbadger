$(function() {
  $("#category").change(function updateDynamicCategoryText() {
    $(".js-category").text($(this).val());
  }).trigger("change");

  $("#categoryAward").change(function showOrHideRelevantFields() {
    $("#categoryWeight").parent().toggle(!this.checked);
    $("#categoryRequirement").parent().toggle(this.checked);
  }).trigger("change");
});