import cs from 'classnames'
import { action, computed, observable } from 'mobx'
import { observer } from 'mobx-react'
import React, { Component, createRef } from 'react'
import Tooltip from '@cypress/react-tooltip'
import { $ } from '@packages/driver'
import UrlParse from 'url-parse'

import { configFileFormatted } from '../lib/config-file-formatted'
import SelectorPlayground from '../selector-playground/selector-playground'
import selectorPlaygroundModel from '../selector-playground/selector-playground-model'
import Studio from '../studio/studio'
import studioRecorder from '../studio/studio-recorder'
import eventManager from '../lib/event-manager'

@observer
export default class Header extends Component {
  @observable showingViewportMenu = false
  @observable urlInput = ''
  urlInputRef = createRef()

  render () {
    const { state, config } = this.props

    return (
      <header
        ref='header'
        className={cs({
          'showing-selector-playground': selectorPlaygroundModel.isOpen,
          'showing-studio': studioRecorder.isOpen,
        })}
      >
        <div className='sel-url-wrap'>
          <Tooltip
            title='Open Selector Playground'
            visible={selectorPlaygroundModel.isOpen || studioRecorder.isActive ? false : null}
            wrapperClassName='selector-playground-toggle-tooltip-wrapper'
            className='cy-tooltip'
          >
            <button
              aria-label='Open Selector Playground'
              className='header-button selector-playground-toggle'
              onClick={this._togglePlaygroundOpen}
              disabled={state.isLoading || state.isRunning || studioRecorder.isActive}
            >
              <i aria-hidden="true" className='fas fa-crosshairs' />
            </button>
          </Tooltip>
          <div className={cs('menu-cover', { 'menu-cover-display': this._studioNeedsUrl })} />
          <form
            className={cs('url-container', {
              'loading': state.isLoadingUrl,
              'highlighted': state.highlightUrl,
              'menu-open': this._studioNeedsUrl,
              'url-prefix-enabled': !!this._baseUrl,
            })}
            onSubmit={this._studioNeedsUrl ? this._visitUrlInput : undefined}
          >
            <span className='url-addon url-prefix'>
              {`${this._baseUrl}/`}
            </span>
            <span className='url-input-wrapper'>
              <input
                ref={this.urlInputRef}
                className={cs('url', { 'input-active': this._studioNeedsUrl })}
                value={this._studioNeedsUrl ? this.urlInput : state.url}
                readOnly={!this._studioNeedsUrl}
                onChange={this._studioNeedsUrl ? this._onUrlInput : undefined}
                onClick={!this._studioNeedsUrl ? this._openUrl : undefined}
              />
              <div className='popup-menu url-menu'>
                <p><strong>Please enter a valid URL to visit.</strong></p>
                <div className='menu-buttons'>
                  <button type='button' className='btn-cancel' onClick={this._cancelStudio}>Cancel</button>
                  <button type='submit' className='btn-submit' disabled={!this.urlInput}>Go <i className='fas fa-arrow-right' /></button>
                </div>
              </div>
            </span>
            <span className='url-addon loading-container'>
              ...loading <i className='fas fa-spinner fa-pulse' />
            </span>
          </form>
        </div>
        <ul className='menu'>
          <li className={cs('viewport-info', { 'menu-open': this.showingViewportMenu })}>
            <button onClick={this._toggleViewportMenu}>
              {state.width} <span className='the-x'>x</span> {state.height} <span className='viewport-scale'>({state.displayScale}%)</span>
              <i className='fas fa-fw fa-info-circle' />
            </button>
            <div className='popup-menu viewport-menu'>
              <p>The <strong>viewport</strong> determines the width and height of your application. By default the viewport will be <strong>{state.defaults.width}px</strong> by <strong>{state.defaults.height}px</strong> unless specified by a <code>cy.viewport</code> command.</p>
              <p>Additionally you can override the default viewport dimensions by specifying these values in your {configFileFormatted(config.configFile)}.</p>
              <pre>{/* eslint-disable indent */}
                {`{
  "viewportWidth": ${state.defaults.width},
  "viewportHeight": ${state.defaults.height}
}`}
              </pre>{/* eslint-enable indent */}
              <p>
                <a href='https://on.cypress.io/viewport' target='_blank'>
                  <i className='fas fa-info-circle' />
                  Read more about viewport here.
                </a>
              </p>
            </div>
          </li>
        </ul>
        <SelectorPlayground model={selectorPlaygroundModel} />
        <Studio model={studioRecorder} />
      </header>
    )
  }

  componentDidMount () {
    this.previousSelectorPlaygroundOpen = selectorPlaygroundModel.isOpen
    this.previousRecorderIsOpen = studioRecorder.isOpen
  }

  componentDidUpdate () {
    if (selectorPlaygroundModel.isOpen !== this.previousSelectorPlaygroundOpen) {
      this._updateWindowDimensions()
      this.previousSelectorPlaygroundOpen = selectorPlaygroundModel.isOpen
    }

    if (studioRecorder.isOpen !== this.previousRecorderIsOpen) {
      this._updateWindowDimensions()
      this.previousRecorderIsOpen = studioRecorder.isOpen
    }

    if (this._studioNeedsUrl) {
      this.urlInputRef.current.focus()
    }
  }

  _updateWindowDimensions = () => {
    this.props.state.updateWindowDimensions({
      headerHeight: $(this.refs.header).outerHeight(),
    })
  }

  _togglePlaygroundOpen = () => {
    selectorPlaygroundModel.toggleOpen()
  }

  _openUrl = () => {
    window.open(this.props.state.url)
  }

  @computed get _studioNeedsUrl () {
    return studioRecorder.isActive && !studioRecorder.url && !this.props.state.url
  }

  @computed get _baseUrl () {
    if (!this._studioNeedsUrl) return

    const url = new UrlParse()

    if (parseInt(url.port) !== this.props.config.port) {
      return url.origin
    }
  }

  @action _onUrlInput = (e) => {
    this.urlInput = e.target.value
  }

  @action _visitUrlInput = (e) => {
    e.preventDefault()

    const reHttp = /^https?:\/\//

    let url

    if (this._baseUrl) {
      url = new UrlParse(this.urlInput, this._baseUrl).toString()
    } else {
      url = this.urlInput

      if (!reHttp.test(url)) {
        url = `http://${url}`
      }
    }

    studioRecorder.visitUrl(url)

    this.urlInput = ''
  }

  _cancelStudio = () => {
    eventManager.emit('studio:cancel')
  }

  @action _toggleViewportMenu = () => {
    this.showingViewportMenu = !this.showingViewportMenu
  }
}
