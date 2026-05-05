  const normalizeProductName =
(name) => {
  let text =
    String(name)
    .toLowerCase()

    // symbols
    .replace(
      /[^a-z0-9 ]/g,
      " "
    )

    // common product shortcuts
    .replace(
      /\bsukr\b/g,
      "sukari"
    )
    .replace(
      /\bsukal\b/g,
      "sukari"
    )
    .replace(
      /\bsugar\b/g,
      "sukari"
    )

    .replace(
      /\bmcel\b/g,
      "mchele"
    )
    .replace(
      /\bmchle\b/g,
      "mchele"
    )

    .replace(
      /\bmaha\b/g,
      "maharage"
    )
    .replace(
      /\bharage\b/g,
      "maharage"
    )

    .replace(
      /\bsbn\b/g,
      "sabuni"
    )
    .replace(
      /\bsabn\b/g,
      "sabuni"
    )

    .replace(
      /\bungaa\b/g,
      "unga"
    )

    // remove units
    .replace(
      /\bkg\b/g,
      ""
    )
    .replace(
      /\bkilo\b/g,
      ""
    )
    .replace(
      /\bgm\b/g,
      ""
    )
    .replace(
      /\bltr\b/g,
      ""
    )
    .replace(
      /\bml\b/g,
      ""
    )
    .replace(
      /\bpkt\b/g,
      ""
    )
    .replace(
      /\bpack\b/g,
      ""
    )
    .replace(
      /\bpc\b/g,
      ""
    )
    .replace(
      /\bpcs\b/g,
      ""
    )
    .replace(
      /\bbox\b/g,
      ""
    )

    // remove numbers
    .replace(
      /\b\d+\b/g,
      ""
    )

    // spaces
    .replace(
      / +/g,
      " "
    )
    .trim();

  return text;
};

module.exports =
normalizeProductName;
