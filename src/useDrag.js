import React from 'react'
import deepEqual from 'deep-equal'

// add custom event functionality to IE >= 9
// 
// source: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent#Polyfill
// 
(function () {
  if ( typeof window.CustomEvent === "function" ) return false; //If not IE

  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();

const debounce = (cb, time) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => cb(...args), time)
  }
}

const usePrevious = (value) => {
  const ref = React.useRef()
  React.useEffect(() => {
    ref.current = value // Store current value in ref
  })
  return ref.current // This happens before the useEffect, therefore returning the previous value
}

const transitionTimes = {
  moving: 450,
  dropping: 350
}

const getItemDimensions = (itemEl, itemStyle) => ({
  height: itemEl.offsetHeight,
  width: itemEl.offsetWidth,
  margin: {
    top: parseInt(itemStyle.marginTop),
    right: parseInt(itemStyle.marginRight),
    bottom: parseInt(itemStyle.marginBottom),
    left: parseInt(itemStyle.marginLeft)
  },
  outer: {
    x: itemEl.offsetWidth + parseInt(itemStyle.marginRight) + parseInt(itemStyle.marginLeft),
    y: itemEl.offsetHeight + parseInt(itemStyle.marginTop) + parseInt(itemStyle.marginBottom)
  }
})

const getListOffset = (listStyle, itemStyle) => ({
  x: parseInt(listStyle.paddingLeft) + parseInt(listStyle.borderLeftWidth) + parseInt(itemStyle.marginLeft),
  y: parseInt(listStyle.paddingTop) + parseInt(listStyle.borderTopWidth) + parseInt(itemStyle.marginTop)
})

const getItemWrap = (listEl, listStyle, itemEl, itemStyle) => {
  const listInnerOffset = parseInt(listStyle.paddingLeft) + parseInt(listStyle.borderLeftWidth) + parseInt(listStyle.paddingRight) + parseInt(listStyle.borderRightWidth)
  const res = Math.trunc((listEl.offsetWidth - listInnerOffset) / (itemEl.offsetWidth + parseInt(itemStyle.marginRight) + parseInt(itemStyle.marginLeft)))
  return res
}

const useDrag = () => {
  // keep track of the state of the list, i.e. 'grabbing', 'dragging', 'dropping'
  const [listState, setListState] = React.useState(null)
  // original index of item being dragged
  const [grabbingIndex, setGrabbingIndex] = React.useState(null)
  // x, y coordinates representing dragging items original position on screen, format [x, y, scrollX, scrollY]
  const [dragStart, setDragStart] = React.useState(false)
  // index of list the dragged item is being dragged over
  const [draggingOver, setDraggingOver] = React.useState(null)
  // the number of items per row of the wrapped list, recalculates on screen resize
  const [itemWrap, setItemWrap] = React.useState(null)
  // dimensions of the first item in the list (all items must be the same size)
  // format is {height, width, margin}
  // height and width include any padding and borders, margin format is {top, right, bottom, left}
  const [itemDimensions, setItemDimensions] = React.useState()
  // difference between the bounds of the list element and the bounds items in the list may occupy
  // format {x, y} representing list padding and border width, plus item margin for left and top for x, y accordingly
  const [listOffset, setListOffset] = React.useState()
  // handle auto scrolling when a dragged item is near the edge of the screen
  const [autoScroll, setAutoScroll]= React.useState(false)
  const [autoScrollId, setAutoScrollId]= React.useState(null)

  const previousAutoScroll = usePrevious(autoScroll)

  const previousState = usePrevious(listState)
  const previousDraggingOver = usePrevious(draggingOver)

  const listEl = React.useRef(null)
  const draggingEl = React.useRef(null)
  const placeholder = React.useRef(null)

  // calculate list item dimensions
  // this assumes that all items in the list are the same size
  // also, calculate list container inside offset from it's bounding rectangle coordinates
  React.useEffect(() => {
    const item = listEl.current.firstElementChild
    const itemStyle = window.getComputedStyle(item)
    const listStyle = window.getComputedStyle(listEl.current)
    
    setItemDimensions(getItemDimensions(item, itemStyle))
    setListOffset(getListOffset(listStyle, itemStyle))

    setItemWrap(getItemWrap(listEl.current, listStyle, item, itemStyle))
    const handleResize = debounce(() => setItemWrap(getItemWrap(listEl.current, listStyle, item, itemStyle)), 500)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // find what index in the wrapped list the dragged item is being dragged over
  const getDraggingOver = React.useCallback(center => {
    const listBounds = listEl.current.getBoundingClientRect()

    // check if element is within list
    if (center.x < listBounds.left || center.x > listBounds.right || center.y < listBounds.top || center.y > listBounds.bottom) return null
    
    const leftInList = center.x - listBounds.x - listOffset.x
    const leftIndex = Math.trunc(leftInList / (itemDimensions.width + parseInt(itemDimensions.margin.left) + parseInt(itemDimensions.margin.right)))
    const topInList = center.y - listBounds.y - listOffset.y
    const topIndex = Math.trunc(topInList / (itemDimensions.height + parseInt(itemDimensions.margin.top) + parseInt(itemDimensions.margin.bottom)))
    
    return leftIndex + topIndex * itemWrap
  }, [ itemWrap, itemDimensions, listOffset ])

  const handleDragScroll = React.useCallback(bounds => {
    const { offsetHeight, offsetWidth, clientHeight, clientWidth } = document.documentElement
    const { scrollY, scrollX } = window
    if (offsetHeight <= clientHeight && offsetWidth <= clientWidth) return false

    const scrollBy = [0, 0]

    if (scrollX && bounds.left < 50) {
      scrollBy[0] = -5
    } else if (scrollX < offsetWidth - clientWidth && bounds.left > clientWidth - 50) {
      scrollBy[0] = 5
    }

    if (scrollY && bounds.top < 50) {
      scrollBy[1] = -5
    } else if (scrollY < offsetHeight - clientHeight && bounds.bottom > clientHeight - 50) {
      scrollBy[1] = 5
    }

    if (!autoScroll) {
      if (!deepEqual(scrollBy, [0, 0])) {
        setAutoScroll(scrollBy)
      }
    } else {
      if (!deepEqual(autoScroll, scrollBy)) {
        setAutoScroll(deepEqual(scrollBy, [0, 0]) ? false : scrollBy)
      }
    }
  }, [autoScroll])

  React.useEffect(() => {
    if (!!autoScroll && !deepEqual(autoScroll, previousAutoScroll)) {
      if (autoScrollId) {
        window.clearInterval(autoScrollId)
      }
      const interval = window.setInterval(() => window.scrollBy(...autoScroll), 10)
      setAutoScrollId(interval)
    } else if (!autoScroll && !!autoScrollId) {
      window.clearInterval(autoScrollId)
      setAutoScrollId(null)
    }
  }, [autoScroll, autoScrollId, previousAutoScroll])
  
  React.useEffect(() => {
    const handleMouseMove = e => {
      if (["grabbing", "dragging"].includes(listState)) {
        const el = draggingEl.current
        if (listState === "grabbing") setListState("dragging")
        
        const oldTranslate = el.style.transform.match(/-?\d+/g)
        const newTranslate = oldTranslate && oldTranslate.length === 2
          ? [parseInt(oldTranslate[0]) + e.movementX, parseInt(oldTranslate[1]) + e.movementY]
          : [e.movementX, e.movementY]
        el.style.transform = `translate(${newTranslate[0]}px, ${newTranslate[1]}px)`

        const bounds = el.getBoundingClientRect()
        const center = {
          x: bounds.x + (bounds.width / 2),
          y: bounds.y + (bounds.height / 2)
        }

        handleDragScroll(bounds)
        
        const newDraggingOver = getDraggingOver(center)
        if (newDraggingOver !== draggingOver) setDraggingOver(newDraggingOver)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => { window.removeEventListener('mousemove', handleMouseMove) }
  }, [ draggingOver, getDraggingOver, listState, handleDragScroll ])
  
  React.useEffect(() => {
    const handleScroll = () => {
      if (["grabbing", "dragging"].includes(listState)) {
        if (listState === "grabbing") setListState("dragging")
        
        const el = draggingEl.current
        const bounds = el.getBoundingClientRect()
        const center = {
          x: bounds.x + (bounds.width / 2),
          y: bounds.y + (bounds.height / 2)
        }

        const newDraggingOver = getDraggingOver(center)
        if (newDraggingOver !== draggingOver) setDraggingOver(newDraggingOver)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => { window.removeEventListener('scroll', handleScroll) }
  }, [ draggingOver, getDraggingOver, listState ])

  React.useEffect(() => {
    const handleMouseUp = () => {
      if (draggingEl.current) {
        setListState(listState === "dragging" ? "dropping" : null)
      }
      if (autoScrollId) {
        window.clearInterval(autoScrollId)
        setAutoScrollId(null)
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => {window.removeEventListener('mouseup', handleMouseUp)}
  }, [ listState, draggingEl, autoScrollId ])

  React.useEffect(() => {
    if (listState === "dropping") {
      window.setTimeout(() => {
        if (listState === "dropping") {
          setListState(null)
          setGrabbingIndex(null)
          setDraggingOver(null)
        }
      }, transitionTimes.dropping)
    }
    if (listState === null) {
      draggingEl.current = null
    }
  }, [ listState, previousState ])

  const handleMouseDown = (e, index) => {
    e.preventDefault()
    setListState('grabbing')
    setGrabbingIndex(index)
    setDraggingOver(index)
    const bounds = e.currentTarget.getBoundingClientRect() 
    setDragStart([bounds.x - itemDimensions.margin.left, bounds.y - itemDimensions.margin.top, window.scrollX, window.scrollY])
    draggingEl.current = e.currentTarget
  }

  const getPlaceholderStyle = () => {
    const styles = ["dragging", "dropping"].includes(listState) ? {
      height: itemDimensions.height,
      width: itemDimensions.width,
      margin: `${Object.values(itemDimensions.margin).join('px ')}px`
    } : {}
    return {
      order: "999",
      ...styles
    }
  }

  // determine whether element at given index needs to shift out of the way of the dragging element
  const shouldShift = React.useCallback(i => {
    // check if an element is being dragged
    if (listState === "dragging"
      // make sure this element is not the element being dragged
      && i !== parseInt(grabbingIndex)
      // make sure the dragged element is dragging over the container
      && Number.isInteger(parseInt(draggingOver))
      // check item appears after item being dragged over
      && (draggingOver >= grabbingIndex
        ? i > draggingOver
        : i >= draggingOver
      )) return true
    
    const droppingIndex = Number.isInteger(draggingOver) ? draggingOver : grabbingIndex
    
    if (listState === "dropping"
      // make sure this element is not the element being dragged
      && i !== parseInt(grabbingIndex)
      // check item appears after item being dragged over
      && (droppingIndex >= grabbingIndex
        ? i > droppingIndex
        : i >= droppingIndex
      )) return true
  }, [ listState, grabbingIndex, draggingOver ])

  // determine whether item needs to wrap up/down to a new line when shifting
  const shouldWrap = React.useCallback(i => {
    // don't wrap first item in list
    return i > 0
      // check if item comes after the grabbed item or before
      && (i > grabbingIndex
        // if after, check if item is the first element in it's row
        ? i % itemWrap === 0
        // if before, check if item is the last item in it's row
        : i % itemWrap === (itemWrap - 1)
      )
  }, [ grabbingIndex, itemWrap ])

  const getDropPosition = React.useCallback(() => {
    const scrollPos = [window.scrollX, window.scrollY]
    
    if (draggingOver === null) return { transform: `translate(${dragStart[2] - scrollPos[0]}px, ${dragStart[3] - scrollPos[1]}px)`}

    const startXY = [ dragStart[0] + itemDimensions.margin.left, dragStart[1] + itemDimensions.margin.top ]
    
    const dropXY = [
      listEl.current.offsetLeft + listOffset.x + (draggingOver % itemWrap * itemDimensions.outer.x),
      listEl.current.offsetTop + listOffset.y + (Math.trunc(draggingOver / itemWrap) * itemDimensions.outer.y)
    ]
    const oldTranslate = draggingEl.current.style.transform.match(/-?\d+/g)
    const translateDiff = dropXY.map((axis, index) => axis - (startXY[index] + (parseInt(oldTranslate[index]))))

    const newTranslate = oldTranslate.map((axis, index) => parseInt(axis) + translateDiff[index] - scrollPos[index])

    return { transform: `translate(${newTranslate[0]}px, ${newTranslate[1]}px)`}
  }, [ draggingOver, dragStart, listEl, listOffset, itemWrap, itemDimensions ])

  const getItemStyle = React.useCallback(index => {
    if (["dragging", "dropping"].includes(listState)) {
      if (listState ==="dragging" && index === parseInt(grabbingIndex)) return {
        position: "fixed",
        left: dragStart[0] + "px",
        top: dragStart[1] + "px",
        pointerEvents: "none",
        zIndex: "2",
        order: index,
        transition: "unset"
      }

      if (listState === "dropping" && index === parseInt(grabbingIndex)) return {
        position: "fixed",
        left: dragStart[0] + "px",
        top: dragStart[1] + "px",
        ...getDropPosition(),
        pointerEvents: "none",
        zIndex: "2",
        order: index,
        transition: `transform ${transitionTimes.dropping}ms cubic-bezier(${draggingOver === null ? "0.32, 0, 0.32, 1" : "0.23, 1, 0.32, 1"})`
      }
      
      const itemStyle = {
        order: index,
        ...(previousState !== "grabbing") && {transition: `transform ${transitionTimes.moving}ms cubic-bezier(0.2, 0, 0, 1)`}
      }

      if (shouldShift(index)) {
        if (shouldWrap(index)) return {
          transform: `translate(-${200 * (itemWrap - 1)}px, 200px)`,
          zIndex: "1",
          ...itemStyle
        }
        return {
          transform: "translate(200px, 0px)",
          ...itemStyle
        }
      }

      return itemStyle
    }
    return { order: index }
  }, [ listState, grabbingIndex, dragStart, itemWrap, shouldShift, shouldWrap, getDropPosition, previousState, draggingOver ])

  // dispatch custom events on the list based on state and drag change
  React.useEffect(() => {
    if (listState === "dragging") {
      if (previousState === "grabbing") {
        const event = new CustomEvent('usedrag-dragstart', {
          detail: {
            source: grabbingIndex
          }
        })
        window.dispatchEvent(event)
        return
      }
      if (draggingOver === previousDraggingOver) return
      const event = new CustomEvent('usedrag-dragupdate', {
        detail: {
          source: grabbingIndex,
          destination: draggingOver
        }
      })
      window.dispatchEvent(event)
      return
    }
    if (listState === null && previousState === "dropping") {
      const event = new CustomEvent('usedrag-dragend', {
        detail: {
          source: grabbingIndex,
          destination: draggingOver
        }
      })
      window.dispatchEvent(event)
    }
  }, [ listState, previousState, draggingOver, grabbingIndex, previousDraggingOver ])

  const dragList = {
    innerRef: listEl
  }
  const dragItem = index => ({
    innerProps: {
      onMouseDown: e => handleMouseDown(e, index),
      style: getItemStyle(index)
    }
  })
  const dragPlaceholder = <div ref={ placeholder } style={ getPlaceholderStyle() } />

  return [ dragList, dragItem, dragPlaceholder ]
}

export default useDrag