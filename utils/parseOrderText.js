 const nums =
  line.match(/\d+/g) || [];

if (nums.length < 2)
  continue;

const qty =
  Number(nums[nums.length - 2]);

const totalPrice =
  Number(nums[nums.length - 1]);

if (!qty || !totalPrice)
  continue;

let name = line;

// remove qty mwisho karibu
name = name.replace(
  new RegExp(
    "\\b" + qty + "\\b"
  ),
  ""
);

// remove total mwisho
name = name.replace(
  new RegExp(
    "\\b" +
    totalPrice +
    "\\b"
  ),
  ""
);

name = name
  .replace(
    /x|pcs|pc|pkt|kg|g|ltr|ml/gi,
    " "
  )
  .replace(/\s+/g, " ")
  .trim();

if (!name) continue;

items.push({
  name,
  qty,
  buyPrice:
    Math.round(
      totalPrice / qty
    ),
});
