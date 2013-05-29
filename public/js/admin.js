$(function() {
  $("#categoryAward").change(function updateDynamicCategoryAwardText() {
    $(".js-category-award").text($(this).val());
    $(".js-category-award-only").toggle(!!$(this).val());
    $(".js-non-category-award-only").toggle(!$(this).val());
  }).trigger("change");
});