/** @jsx React.DOM */
var $ = require('jquery');

var _ = require('underscore');

var React = require('react');

window.React = require('react');

var objectAssign = require('object-assign');

var Fluxxor = require('fluxxor');
var constants = require('./constants.js');
var actions = require('./actions.js');
var TabWindowStore = require('./tabWindowStore.js');

var FluxMixin = Fluxxor.FluxMixin(React),
    StoreWatchMixin = Fluxxor.StoreWatchMixin;

var WINDOW_HEADER_HEIGHT = 22;

var styles = {
  noWrap: { 
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // This is the container for a single tabWindow, consisting of its
  // header and tabs:
  windowInfo: {
    border: '1px solid #bababa',
    borderRadius: 3,
    marginBottom: 8,
    maxWidth: 345,
    display: 'flex',
    flexDirection: 'column'
  },
  windowInfoHover: {
    boxShadow: '0px 0px 5px 2px #7472ff'
  },
  windowHeader: {
    backgroundColor: '#ebe9eb',
    borderBottom: '1px solid #bababa',
    height: WINDOW_HEADER_HEIGHT,
    maxHeight: WINDOW_HEADER_HEIGHT,
    paddingLeft: 3,
    paddingRight: 3,
    marginBottom: 3,
    display: 'inline-flex',
    // justifyContent: 'space-between',
    alignItems: 'center'
  },
  tabItem: {
    height: 20,
    maxHeight: 20,
    paddingLeft: 3,
    paddingRight: 3,
    display: 'flex',
    alignItems: 'center'
  },
  windowList: { 
    fontSize: 12,
    // lineHeight: '100%',
    width: 245,
    maxWidth: 245,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginLeft: 3
  },
  tabTitle: {
    width: 285
  },  
  expandablePanel: {
    width: '100%',
    position: 'relative',
    minHeight: WINDOW_HEADER_HEIGHT,
    overflow: 'hidden'
  },

  expandablePanelContentClosed: {
    marginTop: '-999px'
  },

  expandablePanelContentOpen: {
    marginTop: 0
  },
  windowExpand: {
    WebkitMaskImage: 'url("../images/triangle-small-4-01.png")',
    backgroundColor: '#606060'
  },
  windowCollapse: {
    WebkitMaskImage: 'url("../images/triangle-small-1-01.png")',
    backgroundColor: '#606060',
  },
  // Hmmm, we use this as a common base for both
  // 
  headerButton: {
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    backgroundRepeat: 'no-repeat',
    width: 16,
    height: 16,
    marginLeft: 1,
    marginRight: 0 
  },
  favIcon: {
    width: 16,
    height: 16,
    marginRight: 3
  },
  hidden: {
    visibility: 'hidden'
  },
  visible: {
    visibility: 'visible'
  },
  open: {
  },
  closed: {
    color: '#979ca0'    
  },
  tabManagedButton: {
    WebkitMaskImage: 'url("../images/status-9.png")',
    backgroundColor: '#7472ff'
  },
  windowManagedButton: {
    WebkitMaskImage: 'url("../images/Status-9.png")',
    backgroundColor: '#7472ff'
  },
  revertButton: { 
      WebkitMaskImage: 'url("../images/chevron-double-mix-1-01.png")',
      backgroundColor: '#7472ff',
      marginRight: '20px'
  },
  closeButton: {
    background: 'url("../images/interface-80.png")',
    'float': 'right'  
  },
  closeButtonHover: {
    background: 'url("../images/interface-94.png")'
  },
  tabList: {
    marginLeft: 0
  },
  spanClosed: {
    color: '#979ca0'
  },
  activeSpan: {
    fontWeight: 'bold',
  },
  windowTitle: {
    fontWeight: 'bold'
  }
}

function m() {
  var res = {};
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i]) {
      objectAssign(res, arguments[i]);
    } else {
      if (typeof(arguments[i])==="undefined") {
        throw new Error("m(): argument " + i + " undefined");
      }
    }
  }
  return res;
}

var bgw = chrome.extension.getBackgroundPage();

// expand / contract button for a window
var R_ExpanderButton = React.createClass({
  handleClicked: function(event) {
    var nextState = !this.props.expanded;
    this.props.onClick(nextState);
    event.stopPropagation();
  },
  render: function() {
    var expandStyle = this.props.expanded ? styles.windowCollapse : styles.windowExpand;
    var buttonStyle = m(styles.headerButton,expandStyle);
    return ( 
      <button style={buttonStyle}
              onClick={this.handleClicked} />
    );
  }
});

/**
 * mixin for that maintains a "hovering" state
 * and provides callbacks for mouseOver/mouseOut
 * User of mixin must connect these callbacks to onMouseOver / onMouseOut
 * of appropriate component
 */
var Hoverable = {
  getInitialState: function() {
    return { "hovering": false }
  },

  handleMouseOver: function() {
    this.setState({"hovering": true});
  },

  handleMouseOut: function() {
    this.setState({"hovering": false});
  }  
};

// A button that will merge in hoverStyle when hovered over
var R_HeaderButton = React.createClass({
  mixins: [Hoverable],
  handleClick: function(event) {
    if (this.props.visible) {
      this.props.onClick();
      event.stopPropagation();
    }
  },

  render: function() {
    var visibilityStyle = this.props.visible ? styles.visible : styles.hidden;
    var hoverStyle = (this.state.hovering && this.props.hoverStyle) ? this.props.hoverStyle : null;
    var buttonStyle = m(this.props.baseStyle,visibilityStyle,hoverStyle);
    return (<button style={buttonStyle} title={this.props.title} onClick={this.handleClick}
              onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} 
            />);
  }  
})


var R_WindowHeader = React.createClass({
  mixins:[Hoverable],
  render: function() {
    var tabWindow = this.props.tabWindow;
    var managed = tabWindow.isManaged();
    var windowTitle = tabWindow.getTitle();
    var windowId = tabWindow.chromeWindow && tabWindow.chromeWindow.id;

    var hoverStyle = this.state.hovering ? styles.visible : styles.hidden;

    var windowCheckItem;

    if( managed ) {
      windowCheckItem =  <button style={m(styles.headerButton,styles.windowManagedButton)} title="Stop managing this window" />;
      // TODO: callbacks!
    } else {
      var checkStyle = m(styles.headerButton,hoverStyle);
      windowCheckItem = <input style={checkStyle} type="checkbox" title="Bookmark this window (and all its tabs)" />;
    }

    var windowTitle = tabWindow.getTitle();   
    var openStyle = tabWindow.open ? styles.open : styles.closed;
    var titleStyle = m(styles.windowList,styles.noWrap,styles.windowTitle,openStyle);

    var closeStyle = m(styles.headerButton,styles.closeButton);

    // We use hovering in the window header (this.state.hovering) to determine 
    // visibility of both the revert button and close button appearing after the window title.
    var revertButton = <R_HeaderButton baseStyle={m(styles.headerButton,styles.revertButton)} 
                          visible={this.state.hovering && managed && tabWindow.open} 
                          title="Revert to bookmarked tabs (Close other tabs)" 
                          onClick={this.props.onRevert} />

    var closeButton = <R_HeaderButton baseStyle={closeStyle} visible={this.state.hovering} 
                          hoverStyle={styles.closeButtonHover} title="Close Window" 
                          onClick={this.props.onClose} />

    // console.log("WindowHeader: ", windowTitle, openStyle, managed, this.props.expanded);

    return (
      <div style={m(styles.windowHeader,styles.noWrap)}
          onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} 
          onClick={this.props.onOpen} >
        {windowCheckItem}
        <R_ExpanderButton expanded={this.props.expanded} onClick={this.props.onExpand} />
        <span style={titleStyle}>{windowTitle}</span>
        {revertButton}
        {closeButton}
      </div>
    );
  }
});

var R_TabItem = React.createClass({
  render: function() {
    var tabWindow = this.props.tabWindow;
    var tab = this.props.tab;

    var managed = tabWindow.isManaged();

    var tabTitle = tab.title;

    // span style depending on whether open or closed window
    var tabOpenStyle = tabWindow.open ? null : styles.spanClosed;

    var tabCheckItem;

    if ( managed ) {
      if( !tab.open )
        tabOpenClass = "closed";


      if (tab.bookmarked ) {
        tabCheckItem = <button style={m(styles.headerButton,styles.tabManagedButton)} title="Remove bookmark for this tab" />;
        // TODO: callback
      } else {
        tabCheckItem = <input style={styles.headerButton} type="checkbox" title="Bookmark this tab" />;
        //showWhenHoverOn( tabCheckItem, tabItem );
        // TODO: callback
        //tabCheckItem.onchange = makeTabAddBookmarkHandler( tab );
      }
    } else {
      // insert a spacer:
      tabCheckItem = <div style={styles.headerButton} />;
    }

    var fiSrc=tab.favIconUrl ? tab.favIconUrl : "";
    var tabFavIcon = <img style={styles.favIcon} src={fiSrc} />;

    var tabActiveStyle = tab.active ? styles.activeSpan : null;
    var tabTitleStyles = m(styles.windowList,styles.tabTitle,styles.noWrap,tabOpenStyle,tabActiveStyle);
    return (
      <div style={m(styles.noWrap,styles.tabItem)}>
        {tabCheckItem}
        {tabFavIcon}
        <span style={tabTitleStyles}>{tabTitle}</span>
      </div>);
  }

});

var R_TabWindow = React.createClass({
  mixins: [Hoverable],

  getInitialState: function() {
    // Note:  We initialize this with null rather than false so that it will follow
    // open / closed state of window
    return ({expanded: null});
  },

  handleOpen: function() {
    console.log("handleOpen");
    bgw.tabMan.flux.actions.openTabWindow(this.props.tabWindow);
  },

  handleClose: function(event) {
    console.log("handleClose");
    bgw.tabMan.flux.actions.closeTabWindow(this.props.tabWindow);
  },

  handleRevert: function(event) {
    console.log("handleRevert");
    bgw.tabMan.flux.actions.revertTabWindow(this.props.tabWindow);
  },


  /* expanded state follows window open/closed state unless it is 
   * explicitly set interactively by the user
   */
  getExpandedState: function() {
    if (this.state.expanded === null) {
      return this.props.tabWindow.open;
    } else {
      return this.state.expanded;
    }
  },

  renderTabItems: function(tabWindow,tabs) {
    var items = [];
    for (var i = 0; i < tabs.length; i++ ) {
      var id = "tabItem-" + i;
      var tabItem = <R_TabItem tabWindow={tabWindow} tab={tabs[i]} key={id} />;
      items.push(tabItem);
    };

    var expanded = this.getExpandedState();
    var expandableContentStyle = expanded ? styles.expandablePanelContentOpen : styles.expandablePanelContentClosed;
    var tabListStyle = m(styles.tabList,expandableContentStyle);
    return (
      <div style={tabListStyle}  >
        {items}
      </div>);
  },

  handleExpand: function(expand) {
    this.setState({expanded: expand});
  },

  render: function () {
    var tabWindow = this.props.tabWindow;
    var tabs = tabWindow.getTabItems();
    var tabItems = this.renderTabItems(tabWindow,tabs);
    var expanded = this.getExpandedState();
    var windowHeader = 
      <R_WindowHeader tabWindow={tabWindow} 
          expanded={expanded} 
          onExpand={this.handleExpand} 
          onOpen={this.handleOpen}
          onRevert={this.handleRevert}
          onClose={this.handleClose}
        />;

    var hoverStyle=this.state.hovering ? styles.windowInfoHover : null;
    var windowStyles=m(styles.windowInfo,styles.expandablePanel,hoverStyle);

    return (
      <div style={windowStyles} onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} >
        {windowHeader}
        {tabItems}
      </div>
      );
  }
});

/*
 * top-level element for all tab windows
 */
var R_TabWindowList = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin("TabWindowStore")],

  getInitialState: function() {
    return {};
  },

  getStateFromFlux: function() {
    var store = bgw.tabMan.winStore;

    return {
      tabWindows: store.getAll()
    };
  },

  render: function() {
    console.log("TabWindowList: render");
    var currentWindowElem = [];
    var managedWindows = [];
    var unmanagedWindows = [];

    var currentWindow = this.props.currentWindow;
    var tabWindows = this.state.tabWindows;
    for (var i=0; i < tabWindows.length; i++) {
      var tabWindow = tabWindows[i];
      var id = "tabWindow" + i;
      if (tabWindow) {
          var isCurrent = tabWindow.open && tabWindow.chromeWindow.id == currentWindow.id;
          var isManaged = tabWindow.isManaged();

          var windowElem = <R_TabWindow tabWindow={tabWindow} key={id} />;
          if (isCurrent) {
            currentWindowElem = windowElem;
          } else if (isManaged) {
            managedWindows.push(windowElem);
          } else {
            unmanagedWindows.push(windowElem);
          }
      }
    }

    return (
      <div>
        <hr/>
        {currentWindowElem}
        <hr/>
        {managedWindows}
        <hr/>
        {unmanagedWindows}
      </div>
    );    
  }
}); 

function renderReact(tabWindows,currentWindow) {
  React.render(
    <R_TabWindowList flux={bgw.tabMan.flux} currentWindow={currentWindow} />,
    document.getElementById('windowList-region')
  );
}

function windowCmpFn( tabWindowA, tabWindowB ) {
  // open windows first:
  if ( tabWindowA.open != tabWindowB.open ) {
    if ( tabWindowA.open )
      return -1;
    else
      return 1;
  }
  var tA = tabWindowA.getTitle();
  var tB = tabWindowB.getTitle();
  return tA.localeCompare( tB );
}

function renderPopup() {
  // initManageDialog();
  console.log( "background page:", bgw );
  chrome.bookmarks.getTree( function ( tree ) {
    console.log( "Bookmarks tree: ", tree );
  });

  function syncAndRender( windowList ) {
    chrome.windows.getCurrent( null, function ( currentWindow ) {
      console.log( "in windows.getCurrent:" );
      console.log( "Chrome Windows: ", windowList );
      logWrap( bgw.tabMan.syncWindowList )( windowList );
      console.log("After syncWindowList");
      var tabWindows = bgw.tabMan.winStore.getAll();
      tabWindows.sort( windowCmpFn );
      console.log( "tabWindows:", tabWindows );
      /*
      for ( var i = 0; i < tabWindows.length; i++ ) {
        var tabWindow = tabWindows[ i ];
        var id = "tabWindow" + i;
        if( tabWindow ) {
          var isCurrent = tabWindow.open && tabWindow.chromeWindow.id == currentWindow.id;
          logWrap( function() { renderTabWindow( tabWindow, isCurrent, id ); } )();
        }
      }
      */
      if (tabWindows.length > 0) {
        logWrap( renderReact )( tabWindows, currentWindow );
      }

    } );
  }

  // wrapper to log exceptions
  function logWrap( f ) {
    function wf() {
      try {
        var ret = f.apply( this, arguments );
      } catch( e ) {
        console.error( "logWrap: caught exception invoking function: " );
        console.error( e.stack );
        throw e;
      }
      return ret;
    }
    return wf;
  }

  chrome.windows.getAll( {populate: true}, logWrap( syncAndRender ) );
}

console.log("hello from popup.js");
console.log("bgw: ", bgw);
renderPopup();
// $(document).bind('ready', tabMan.renderPopup );