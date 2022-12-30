document.querySelectorAll('fieldset.collapsible').forEach(f => {
  if (!f.classList.contains('collapsed') && !f.classList.contains('expanded')) {
    f.classList.add('expanded')
  }
  f.querySelector('legend').addEventListener('click', event => {
    const fieldset = event.target.closest('fieldset')
    if (fieldset.classList.contains('expanded')) {
      fieldset.classList.replace('expanded', 'collapsed')
    } else {
      fieldset.classList.replace('collapsed', 'expanded')
    }
  }, { passive: true })
})
