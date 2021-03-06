// set some variables for padding, size, and labels
export var outer_width = 625;
export var outer_height = 455;
export var padding = { top: 30, right: 0, bottom: 30, left: 60 };
export var inner_width = outer_width - padding.left - padding.right;
export var inner_height = outer_height - padding.top - padding.bottom;
export var popup_width = 200;
export var circle_radius = 6;
export var x_col = "GDP per Capita ($)";
export var y_col = "Suicide Rate per 100k People";

// set some variables for the pie chart
export var pie_width = 225;
export var pie_height = 225;
export var pie_margin = 20;
export var pie_radius = Math.min(pie_width, pie_height) / 2 - pie_margin

// vars for dot opacity
export let selected_opacity = 0.8;
export let faded_opacity = 0.3;
