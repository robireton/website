const nav = document.getElementById('siteNavigation')

function showMenu (button) {
  button.nextElementSibling.classList.remove('hidden')
  button.firstElementChild.classList.add('hidden')
  button.lastElementChild.classList.remove('hidden')
}

function hideMenu (button) {
  button.nextElementSibling.classList.add('hidden')
  button.lastElementChild.classList.add('hidden')
  button.firstElementChild.classList.remove('hidden')
}

function handleMenuClick (event) {
  const button = event.target.closest('button.menuToggle')
  if (button.firstElementChild.classList.contains('hidden')) {
    // switch to hidden
    hideMenu(button)
  } else {
    // switch to visible
    showMenu(button)
  }
}

function handleMenuKey (event) {
  if (event.key.toLowerCase() === 'escape') {
    event.preventDefault()
    console.log('close')
    hideMenu(event.target.closest('nav').querySelector('button'))
  }
}

nav.querySelector('button.menuToggle').addEventListener('click', handleMenuClick, { passive: true })
nav.addEventListener('keyup', handleMenuKey, { passive: false })
