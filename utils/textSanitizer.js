function sanitizer(str) {
  if (str && typeof str == "string") {
    str = str.toLocaleLowerCase().trim();
    return str;
  }
}

module.exports = {sanitizer}
