export default hbs => hbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: { // Do not make into arrow functions! Needs ‘this’
    is: function (a, b, options) {
      return (a === b) ? options.fn(this) : options.inverse(this)
    }

  }
})
