async function uploadFile (url, file, entry) {
  const entryID = Number.parseInt(entry, 10)
  const formData = new window.FormData()
  formData.append('uploadedFile', file)
  if (!Number.isNaN(entryID)) formData.set('entry', entryID)
  return await window.fetch(url, {
    method: 'POST',
    mode: 'same-origin',
    cache: 'no-cache',
    credentials: 'same-origin',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    body: formData
  })
}

async function deleteFile (url) {
  return await window.fetch(url, {
    method: 'DELETE',
    mode: 'same-origin',
    cache: 'no-cache',
    credentials: 'same-origin',
    redirect: 'error',
    referrerPolicy: 'no-referrer'
  })
}

function updateCount (files) {
  const tab = document.getElementById('documents-tab')
  if (tab) tab.querySelector('span').textContent = `Documents (${files.children.length})`
}

const documentsWidget = document.querySelector('fieldset.documents')
if (documentsWidget) {
  const init = () => {
    documentsWidget.querySelectorAll('footer input[type=button]').forEach(button => (button.disabled = true))
    documentsWidget.querySelector('.files').addEventListener('dblclick', event => {
      const file = event.target.closest('.file')
      if (file) {
        documentsWidget.querySelectorAll('.files .file.selected').forEach(f => f.classList.remove('selected'))
        file.classList.add('selected')
        window.open(file.dataset.url, '_blank')
      }
    }, { passive: true })

    documentsWidget.querySelector('.files').addEventListener('click', event => {
      const file = event.target.closest('.file')
      if (file) {
        if (file.classList.contains('selected')) {
          file.classList.remove('selected')
          documentsWidget.querySelectorAll('footer input[type=button]').forEach(input => (input.disabled = true))
          documentsWidget.querySelectorAll('footer input[type=file]').forEach(input => (input.disabled = false))
        } else {
          documentsWidget.querySelectorAll('.files .file.selected').forEach(f => f.classList.remove('selected'))
          file.classList.add('selected')
          documentsWidget.querySelectorAll('footer input[type=button]').forEach(input => (input.disabled = false))
          documentsWidget.querySelectorAll('footer input[type=file]').forEach(input => (input.disabled = true))
        }
      } else {
        documentsWidget.querySelectorAll('.files .file.selected').forEach(f => f.classList.remove('selected'))
        documentsWidget.querySelectorAll('footer input[type=button]').forEach(input => (input.disabled = true))
        documentsWidget.querySelectorAll('footer input[type=file]').forEach(input => (input.disabled = false))
      }
    }, { passive: true })

    documentsWidget.querySelector('footer input[type=file]').addEventListener('change', async event => {
      if (event.target.files.length === 1) {
        const response = await uploadFile(event.target.closest('fieldset').dataset.endpoint, event.target.files.item(0), event.target.form.action.split('/').pop())
        event.target.value = ''
        if (response.ok) {
          const html = await response.text()
          const ul = documentsWidget.querySelector('.files')
          ul.insertAdjacentHTML('beforeend', html)
          updateCount(ul)
        } else {
          console.log(`${response.status} ${response.statusText}`)
          window.alert(await response.text())
        }
      }
    }, { passive: true })

    documentsWidget.querySelector('input[value=Retrieve]').addEventListener('click', _event => {
      const file = documentsWidget.querySelector('.files .file.selected')
      if (file) window.open(file.dataset.url, '_blank')
    }, { passive: true })

    documentsWidget.querySelector('input[value=Delete]').addEventListener('click', async _event => {
      const file = documentsWidget.querySelector('.files .file.selected')
      if (file) {
        const response = await deleteFile(file.dataset.url)
        if (response.ok) {
          file.remove()
          documentsWidget.querySelectorAll('footer input[type=button]').forEach(input => (input.disabled = true))
          documentsWidget.querySelectorAll('footer input[type=file]').forEach(input => (input.disabled = false))
          updateCount(documentsWidget.querySelector('.files'))
        } else {
          const message = await response.text()
          window.alert(message)
        }
      }
    }, { passive: true })
  }
  init()

  document.addEventListener('keydown', async event => {
    const file = documentsWidget.querySelector('.files .file.selected')
    if (file) {
      switch (event.key) {
        case 'Escape':
          file.classList.remove('selected')
          documentsWidget.querySelectorAll('footer input[type=button]').forEach(input => (input.disabled = true))
          documentsWidget.querySelectorAll('footer input[type=file]').forEach(input => (input.disabled = false))
          break
        case 'Enter':
        case 'Space':
          window.open(file.dataset.url, '_blank')
          break
        case 'Backspace':
        case 'Delete':
          {
            const response = await deleteFile(file.dataset.url)
            if (response.ok) {
              file.remove()
              documentsWidget.querySelectorAll('footer input[type=button]').forEach(input => (input.disabled = true))
              documentsWidget.querySelectorAll('footer input[type=file]').forEach(input => (input.disabled = false))
              updateCount(documentsWidget.querySelector('.files'))
            } else {
              const message = await response.text()
              window.alert(message)
            }
          }
          break
        case 'ArrowLeft':
          if (file.previousElementSibling) {
            file.classList.remove('selected')
            file.previousElementSibling.classList.add('selected')
          }
          break
        case 'ArrowRight':
          if (file.nextElementSibling) {
            file.classList.remove('selected')
            file.nextElementSibling.classList.add('selected')
          }
          break
      }
    }
  }, { passive: true })
}
