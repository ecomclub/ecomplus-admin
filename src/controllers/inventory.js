import { i19loading, i19loadMore, i19sku, i19name, i19price, i19unitsInStock, i19sales } from '@ecomplus/i18n'
import { $ecomConfig, i18n, price as getPrice } from '@ecomplus/utils'
import Papa from 'papaparse'
import ecomClient from '@ecomplus/client'

export default function () {
  const { $, app, callApi, tabId } = window

  const size = 20
  let from = 0
  const datatableOptions = {
    pageLength: size,
    bLengthChange: false,
    dom: 'Bfrtip',
    buttons: [
      'csv', 
      'excel'
    ]
  }
  if ($ecomConfig.get('lang') === 'pt_br') {
    datatableOptions.language = {
      aria: {
        sortAscending: ': ative para colocar a coluna em ordem crescente',
        sortDescending: ': ative para colocar a coluna em ordem decrescente'
      },
      paginate: {
        next: 'Próxima',
        previous: 'Anterior'
      },
      emptyTable: 'Tabela vazia',
      info: 'Mostrando _START_ a _END_ de _TOTAL_ SKUs carregados',
      infoEmpty: '',
      infoFiltered: '',
      lengthMenu: 'Mostrar _MENU_ resultados',
      search: 'Buscar',
      zeroRecords: 'Nenhum resultado encontrado'
    }
  }

  const $btnLoad = $('#inventory-load')
  $btnLoad.click(() => {
    from += size
    loadMore()
  })

  const datatable = $('#inventory-table').DataTable(datatableOptions)
  let allRows = []

  const loadMore = () => {
    $btnLoad.attr('disabled', true)
      .find('i').addClass('fa-spin')
      .next().text(i18n(i19loading))

    ecomClient.search({ url: `items.json?size=${size}&from=${from}&sort=sales:desc` })
      .then(({ data }) => {
        const { total, hits } = data.hits
        let i = 0
        const rows = []
        const addRow = item => {
          rows.push({
            sku: item.sku || '',
            name: item.name,
            price: getPrice(item),
            quantity: item.quantity || 0,
            sold: 0
          })
        }

        const next = () => {
          if (hits && hits[i]) {
            const { _id, _source } = hits[i]
            addRow(_source)
            if (_source.variations) {
              _source.variations.forEach(variation => addRow({
                ..._source,
                ...variation
              }))
            }

            callApi(
              `orders.json?items.product_id=${_id}&status!=cancelled` +
                '&fields=items.product_id,items.sku,items.quantity',
              'GET',

              (err, json) => {
                let delay
                if (!err) {
                  const { result } = json
                  result.forEach(order => {
                    order.items.forEach(item => {
                      if (item.product_id === _id) {
                        const row = rows.find(({ sku }) => sku === item.sku)
                        if (row) {
                          row.sold += item.quantity
                        }
                      }
                    })
                  })
                  delay = 0
                } else {
                  console.error(err)
                  app.toast()
                  delay = 300
                }

                setTimeout(() => {
                  i++
                  next()
                }, delay)
              }
            )
          } else {
            allRows = allRows.concat(rows.map(({ sku, name, price, quantity, sold }) => {
              return [sku, name, price, quantity, sold]
            }))
            datatable.clear()
            datatable.rows.add(allRows)
            datatable.draw()

            if (total > from + size) {
              $btnLoad
                .attr('disabled', false)
                .find('i').removeClass('fa-spin')
                .next().text(i18n(i19loadMore))
            } else {
              $btnLoad.slideUp()
            }
          }
        }
        next()
      })

      .catch(err => {
        if (err) {
          console.error(err)
          app.toast()
        }
      })
  }
  loadMore()
  
  const $exportInventory = $('#export-inventory')
  const downloadCsv = exportData => {
    const columns = [`${i18n(i19sku)}`, `${i18n(i19name)}`, `${i18n(i19price)}`, `${i18n(i19unitsInStock)}`]
    const csv = Papa.unparse({
      data: exportData,
      fields: columns
    })
    const csvData = new window.Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    })
    const csvURL = navigator.msSaveBlob
      ? navigator.msSaveBlob(csvData, 'download.csv')
      : window.URL.createObjectURL(csvData)
    const $link = document.createElement('a')
    $link.href = csvURL
    $link.setAttribute('download', 'export-inventory.csv')
    $link.click()
    $(`#t${tabId}-loading`).hide()
  }
  $exportInventory.click(() => {
    let exportInventory = datatable.rows().data()
    downloadCsv(exportInventory)
  })
}
