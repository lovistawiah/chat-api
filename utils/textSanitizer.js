function sanitizer(str) {
  if (str && typeof str == "string") {
    str = str.toLocaleLowerCase().trim();
    console.log(str);
    return str;
  }
}

module.exports = {sanitizer}
