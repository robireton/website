const widgetClassName = 'user-search-widget'
const getOptions = {
  mode: 'same-origin',
  cache: 'no-cache',
  credentials: 'same-origin',
  redirect: 'error',
  referrerPolicy: 'no-referrer'
}

async function handleSelect (option) {
  const widget = option.closest(`.${widgetClassName}`)
  const search = widget.querySelector('input[type=search]')
  const select = widget.querySelector('select')
  const hidden = widget.querySelector('input[type=hidden]')
  const details = {
    uid: option.value,
    text: option.text
  }
  select.classList.add('hidden')
  search.value = details.text
  hidden.value = details.uid
  if ('select' in widget.dataset) {
    try {
      const response = await window.fetch(`${widget.dataset.select}?${new URLSearchParams({ id: details.uid })}`, getOptions)
      if (response.ok) {
        details.html = await response.text()
      } else {
        return searchError(widget, `${response.status} ${response.statusText}`)
      }
    } catch (err) {
      console.log(err)
      return searchError(widget, err.message)
    }
  }
  widget.dispatchEvent(new window.CustomEvent('select', { detail: details }))
}

function searchBegin (widget) {
  const select = widget.querySelector('select')
  const hidden = widget.querySelector('input[type=hidden]')

  select.classList.add('hidden')
  select.replaceChildren()
  hidden.value = ''
  widget.dispatchEvent(new window.CustomEvent('begin'))
}

function searchAbort (widget) {
  const select = widget.querySelector('select')
  const hidden = widget.querySelector('input[type=hidden]')

  select.classList.add('hidden')
  select.replaceChildren()
  hidden.value = ''
  widget.dispatchEvent(new window.CustomEvent('abort'))
}

function searchError (widget, message) {
  const select = widget.querySelector('select')
  const hidden = widget.querySelector('input[type=hidden]')

  select.classList.add('hidden')
  select.replaceChildren()
  hidden.value = ''
  widget.dispatchEvent(new window.CustomEvent('error', { detail: message }))
}

async function initSearch (widget) {
  const search = widget.querySelector('input[type=search]')
  const select = widget.querySelector('select')

  select.classList.add('hidden')

  search.addEventListener('keydown', async event => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        event.stopPropagation()
        select.options[0].selected = true
        select.focus()
        break

      case 'Escape':
        search.value = ''
        searchAbort(widget)
        break
    }
  }, { passive: false })

  search.addEventListener('input', async event => {
    const query = event.target.value.trim()
    if (query.length >= 2) {
      try {
        const response = await window.fetch(`${widget.dataset.search}?${new URLSearchParams({ search: event.target.value })}`, getOptions)
        if (response.ok) {
          const hits = await response.json()
          if (hits.length > 0) {
            select.replaceChildren(...hits.map(hit => new window.Option(hit.text, hit.value)))
            select.classList.remove('hidden')
            return
          }
        } else {
          return searchError(widget, `${response.status} ${response.statusText}`)
        }
      } catch (err) {
        console.log(err)
        return searchError(widget, err.message)
      }
    }
    searchBegin(widget)
  }, { passive: true })

  select.addEventListener('keydown', async event => {
    switch (event.key) {
      case 'ArrowUp':
        if (event.target.selectedIndex === 0) search.focus()
        break
      case 'Enter':
        handleSelect(event.target.selectedOptions[0])
        break
      case 'Escape':
        search.focus()
        break
    }
  }, { passive: true })

  select.addEventListener('dblclick', async event => {
    if (event.target instanceof window.Option) handleSelect(event.target)
  }, { passive: true })

  if (select.options.length > 0) handleSelect(select.options.item(0))
}

Array.from(document.getElementsByClassName(widgetClassName)).forEach(element => initSearch(element))
