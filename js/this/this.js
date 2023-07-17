function Turbo() {
  console.log('Turbo this -> ', this)
}

const Turbo2 = () => {
  console.log('Turbo2 this -> ', this)
}

const callTurbo = (fn) => {
  fn()
}

function init() {
  console.log('init start')
  Turbo()
  Turbo2()
  callTurbo(Turbo)
  callTurbo(Turbo2)
  console.log('init end')
}

init()