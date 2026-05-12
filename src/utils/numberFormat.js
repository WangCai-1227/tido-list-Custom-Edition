function toRoman(num) {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" }
  ];
  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

function toChinese(num) {
  const chars = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (num <= 10) return chars[num] || String(num);
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return chars[tens] + "十" + (ones > 0 ? chars[ones] : "");
  }
  return String(num);
}

function getCelestialStem(num) {
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  return stems[(num - 1) % 10];
}

function getEarthlyBranch(num) {
  const branches = [
    "子",
    "丑",
    "寅",
    "卯",
    "辰",
    "巳",
    "午",
    "未",
    "申",
    "酉",
    "戌",
    "亥"
  ];
  return branches[(num - 1) % 12];
}

export const numberFormats = {
  阿拉伯数字: [
    { id: "arabic", label: "1, 2, 3", pattern: n => n },
    { id: "arabic_dot", label: "1., 2., 3.", pattern: n => n + "." },
    { id: "arabic_paren", label: "(1), (2), (3)", pattern: n => "(" + n + ")" },
    {
      id: "arabic_bracket",
      label: "[1], [2], [3]",
      pattern: n => "[" + n + "]"
    }
  ],
  英文字母: [
    {
      id: "letter_lower",
      label: "a, b, c",
      pattern: n => String.fromCharCode(96 + n)
    },
    {
      id: "letter_lower_dot",
      label: "a., b., c.",
      pattern: n => String.fromCharCode(96 + n) + "."
    },
    {
      id: "letter_upper",
      label: "A, B, C",
      pattern: n => String.fromCharCode(64 + n)
    },
    {
      id: "letter_upper_dot",
      label: "A., B., C.",
      pattern: n => String.fromCharCode(64 + n) + "."
    }
  ],
  罗马数字: [
    {
      id: "roman_upper",
      label: "I, II, III",
      pattern: n => toRoman(n).toUpperCase()
    },
    {
      id: "roman_upper_dot",
      label: "I., II., III.",
      pattern: n => toRoman(n).toUpperCase() + "."
    },
    {
      id: "roman_lower",
      label: "i, ii, iii",
      pattern: n => toRoman(n).toLowerCase()
    }
  ],
  中文数字: [
    { id: "chinese", label: "一, 二, 三", pattern: n => toChinese(n) },
    {
      id: "chinese_dunhao",
      label: "一、二、三",
      pattern: n => toChinese(n) + "、"
    },
    {
      id: "chinese_paren",
      label: "（一）,（二）",
      pattern: n => "（" + toChinese(n) + "）"
    }
  ],
  符号标记: [
    { id: "symbol_dot", label: "•, •, •", pattern: () => "•" },
    { id: "symbol_circle", label: "◦, ◦, ◦", pattern: () => "◦" },
    { id: "symbol_star", label: "★, ★, ★", pattern: () => "★" },
    { id: "symbol_arrow", label: "→, →, →", pattern: () => "→" }
  ],
  天干地支: [
    {
      id: "celestial_stem",
      label: "甲, 乙, 丙",
      pattern: n => getCelestialStem(n)
    },
    {
      id: "earthly_branch",
      label: "子, 丑, 寅",
      pattern: n => getEarthlyBranch(n)
    },
    {
      id: "ganzhi",
      label: "甲子, 乙丑",
      pattern: n => getCelestialStem(n) + getEarthlyBranch(n)
    }
  ]
};

export function getFormatPattern(formatId) {
  for (const group of Object.values(numberFormats)) {
    const format = group.find(f => f.id === formatId);
    if (format) return format.pattern;
  }
  return n => n;
}
