/*!
 * Copyright 2018 E-Com Club
 */

(function () {
  'use strict'

  // current tab ID
  var tabId = window.tabId
  var Tab = window.Tabs[tabId]
  // prefix tab ID on content elements IDs
  window.renderContentIds()

  var slug = window.routeParams[0]
  if (slug === undefined) {
    // first URI param is required
    window.e404()
    return
  }
  var resource = window.apiResources[slug]
  if (resource === undefined) {
    // invalid resource slug
    window.e404()
    return
  }

  var lang = window.lang
  var i18n = window.i18n

  var tabLabel, tabTitle
  var resourceId = window.routeParams[1]
  var creating, listing
  if (resourceId === undefined) {
    // resource root URI
    // default action
    tabLabel = i18n({
      'en_us': 'List',
      'pt_br': 'Listar'
    })
    tabTitle = resource.label[lang]
    listing = true
  } else {
    if (resourceId === 'new') {
      // create
      tabLabel = i18n({
        'en_us': 'Create',
        'pt_br': 'Criar'
      })
      // unset ID
      resourceId = undefined
      creating = true
    } else {
      tabLabel = i18n({
        'en_us': 'Edit',
        'pt_br': 'Editar'
      })
    }
    // tab title with resource name and action
    tabTitle = resource.label[lang] + ' · ' + tabLabel
  }

  // initial rendering
  var html

  // render H1
  if (resourceId === undefined) {
    html = '<strong>' + resource.label[lang] + '</strong> · ' + tabLabel
    $('#t' + tabId + '-resource-name').html(html)
  } else {
    html = '<strong>' + resource.label[lang] + '</strong> · ' + tabLabel + ' ' + '<a class="btn btn-pure" style="font-size: 10px; background: rgba(223,242,0,0.1); padding: 3px 10px" data-provide="tooltip" id="clipboad" data-placement="top" data-original-title="Clique para copiar ID" data-clipboard-text="' + resourceId + '">ID <i class="ti-clipboard"></i></a>'
    $('#t' + tabId + '-resource-name').html(html)
    $('#clipboad').hover(function () {
      $(this).tooltip('show')
    })
    $('#clipboad').click(function () {
      $(this).attr('data-original-title', 'ID copiado!')
      $(this).find('.ti-clipboard').replaceWith('<i class="ti-check"></i>')
      $(this).tooltip('show')
    })
  }

  // render breadcrumb links
  html = '<li class="breadcrumb-item">' +
               '<a href="/#/resources/' + slug + '">' +
                 '<i class="fa fa-' + resource.icon + '"></i> ' + resource.label[lang] +
               '</a>' +
             '</li>' +
             '<li class="breadcrumb-item active">' +
               tabLabel +
             '</li>'
  $('#t' + tabId + '-breadcrumbs').append(html)

  // set up JSON code editor
  var editor = ace.edit('t' + tabId + '-code-editor')
  editor.setTheme('ace/theme/dawn')
  editor.session.setMode('ace/mode/json')
  $('#t' + tabId + '-code-tab').click(function () {
    // focus on editor and force viewport update
    setTimeout(function () {
      editor.focus()
      editor.renderer.updateFull()
    }, 200)
  })

  var loadContent = function (err) {
    // check err if callback
    if (!err) {
      // HTML card content
      var contentUri
      if (listing === true) {
        if (slug !== 'products') {
          // custom list
          contentUri = 'routes/resources/list.html'
        } else {
          // products list
          contentUri = 'routes/resources/list/products.html'
        }
      } else {
        // form to create and edit
        contentUri = 'routes/resources/form/' + slug + '.html'

        // commit changes on JSON document globally
        // improve reactivity
        Tab.commit = commit

        editor.on('blur', function () {
          // code editor manually changed (?)
          var json
          try {
            json = JSON.parse(editor.session.getValue())
          } catch (e) {
            // invalid JSON
            return
          }
          // update data
          Tab.data = json
        })
        editor.on('change', function () {
          window.triggerUnsaved(tabId)
        })
      }
      window.loadContent(contentUri, $('#t' + tabId + '-tab-normal'))
    }
    // show content and unlock screen
    window.routeReady(tabTitle)
  }

  var commit = function (json, updated) {
    if (!updated) {
      // pass JSON data
      Tab.data = json
    }
    // reset Ace editor content
    editor.session.setValue(JSON.stringify(json, null, 4))
  }

  // set resource params globally
  Tab.resourceId = resourceId
  Tab.slug = slug

  if (creating !== true) {
    var endpoint, load, params
    if (resourceId === undefined) {
      // disable edition
      editor.setReadOnly(true)

      if (slug === 'products') {
        // ELS Request Body Search
        // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-body.html
        // default body
        // ref: https://github.com/ecomclub/ecomplus-sdk-js/blob/master/main.js
        var Body = {
          sort: [
            { available: { order: 'desc' } },
            '_score',
            { ad_relevance: { order: 'desc' } },
            { _id: { order: 'desc' } }
          ],
          aggs: {
            'brands.name': { terms: { field: 'brands.name' } },
            'categories.name': { terms: { field: 'categories.name' } },
            status: { terms: { field: 'status' } },
            // Metric Aggregations
            min_price: { min: { field: 'price' } },
            max_price: { max: { field: 'price' } },
            avg_price: { avg: { field: 'price' } }
          },
          // results limit
          size: 30
        }

        // specific load function for products listing
        load = function (callback, query, sort, page, size) {
          var cb = function (err, json) {
            if (!err) {
              // set tab JSON data
              commit(json)
            }
            if (typeof callback === 'function') {
              callback(null, json)
            }
          }

          // body data
          var body
          if (query) {
            // merge params without changing original default body
            // query object with search results conditions
            body = Object.assign({ query: query }, Body)
          } else {
            body = Body
          }
          if (sort) {
            // replace sort rule
            if (body.sort.length > 4) {
              body.sort[2] = sort
            } else {
              body.sort.splice(2, 0, sort)
            }
          }
          // pagination
          if (size) {
            body.size = size
          }
          if (page) {
            body.from = body.size * page
          } else {
            body.from = 0
          }

          // call Search API
          window.callSearchApi('items.json', 'POST', cb, body)
        }
      } else {
        // generic resource listing
        endpoint = slug + '.json'
        // default query string
        // limit up to 60 results by default
        params = 'limit=60&sort=-updated_at'
      }
    } else {
      // specific resource document
      endpoint = slug + '/' + resourceId + '.json'

      // handle pagination buttons
      if (Tab.state.pagination) {
        var $next = $('#t' + tabId + '-pagination-next')
        var $prev = $('#t' + tabId + '-pagination-prev')
        if (Tab.state.page === 0) {
          $prev.addClass('disabled')
        }
        // global tab pagination handler
        Tab.pagination = Tab.state.pagination
        $prev.click(function () {
          $(this).addClass('disabled')
          Tab.pagination(true)
        })
        $next.click(function () {
          $(this).addClass('disabled')
          Tab.pagination()
        }).closest('.pagination-arrows').fadeIn()
      }
    }

    if (!load) {
      // default load function
      load = function (callback, params) {
        var uri = endpoint
        if (params) {
          uri += '?' + params
        }

        // call Store API
        window.callApi(uri, 'GET', function (err, json) {
          if (!err) {
            if (resourceId !== undefined) {
              // editing
              // show modification timestamps
              if (json.created_at) {
                var dateList = [ 'day', 'month', 'year', 'hour', 'minute', 'second' ]
                if (json.updated_at) {
                  $('#t' + tabId + '-updated-at').text(formatDate(json.updated_at, dateList))
                }
                $('#t' + tabId + '-created-at').text(formatDate(json.created_at, dateList))
                  .closest('.document-dates').fadeIn()
              }

              // remove common immutable data
              delete json._id
              delete json.store_id
              delete json.created_at
              delete json.updated_at
            }
            // set tab JSON data
            commit(json)
          }

          if (typeof callback === 'function') {
            callback(null, json)
          }
        })
      }
    }
    // load JSON data globally
    Tab.load = load

    // show create document button
    $('#t' + tabId + '-new').fadeIn().click(function () {
      // redirect to create document page
      window.location = '/' + window.location.hash + '/new'
    })

    // handle delete and edit list items
    Tab.selectedItems = []
    Tab.editItemsCallback = function () {
      // returns callback for bulk action end
      return function () {}
    }
    Tab.editItems = function (bodyObject) {
      bulkAction('PATCH', bodyObject)
    }

    // handle bulk items edit
    var bulkAction = function (method, bodyObject) {
      var todo = Tab.selectedItems.length
      if (todo > 0) {
        $('#modal-saved').modal('show')
        var cb = Tab.editItemsCallback()
        // call API to delete documents
        var done = 0
        // collect all requests errors
        var errors = []

        var next = function () {
          var callback = function (err) {
            if (err) {
              errors.push(err)
            }
            done++
            if (done === todo) {
              // end
              if (typeof cb === 'function') {
                cb(errors)
              }
              // reset selected IDs
              Tab.selectedItems = []
            } else {
              next()
            }
          }
          var id = Tab.selectedItems[done]
          window.callApi(slug + '/' + id + '.json', method, callback, bodyObject)
        }
        $('#list-save-changes').click(next)
        $('#ignore-unsaved').click(function () {
          Tab.selectedItems = []
          load(loadContent, params)
        })
      } else if (!resourceId) {
        // nothing to do, alert
        app.toast(i18n({
          'en_us': 'No items selected',
          'pt_br': 'Nenhum item selecionado'
        }))
      }
    }

    // handle bulk items delet
    var bulkActionDelete = function (method, bodyObject) {
      var todo = Tab.selectedItems.length
      if (todo > 0) {
        var cb = Tab.editItemsCallback()
        // call API to delete documents
        var done = 0
        // collect all requests errors
        var errors = []

        var next = function () {
          var callback = function (err) {
            if (err) {
              errors.push(err)
            }
            done++
            if (done === todo) {
              // end
              if (typeof cb === 'function') {
                cb(errors)
              }
              // reset selected IDs
              Tab.selectedItems = []
            } else {
              next()
            }
          }
          var id = Tab.selectedItems[done]
          window.callApi(slug + '/' + id + '.json', method, callback, bodyObject)
        }
        next()
      } else if (!resourceId) {
        // nothing to do, alert
        app.toast(i18n({
          'en_us': 'No items selected',
          'pt_br': 'Nenhum item selecionado'
        }))
      }
    }

    // show delete button
    $('#t' + tabId + '-delete').fadeIn().click(function () {
      bulkActionDelete('DELETE')
    })

    // preload data, then load HTML content
    load(loadContent, params)
  } else {
    // creating
    // starts with empty object
    commit({})
    loadContent()
  }
}())
