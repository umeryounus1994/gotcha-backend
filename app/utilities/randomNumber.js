exports.randomNumber = function (length) {
  let text = "";
  const possible = "123456789";
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    const sup = Math.floor(Math.random() * possible.length);
    // eslint-disable-next-line eqeqeq
    text += i > 0 && sup == i ? "0" : possible.charAt(sup);
  }
  return Number(text);
};