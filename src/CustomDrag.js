import React from 'react'
import styled from "styled-components";

import useDrag from './useDrag'

const Wrap = styled.div`
  border: 4px solid #ff6040;
  display: flex;
  flex-wrap: wrap;
  min-height: 50vh;
  margin: 0 auto;
  overflow: hidden;
  padding: 25px;
`

const StyledRectangle = styled.div`
  background: ${p => p.even ? "#ff6040" : "#4060ff"};
  color: white;
  cursor: grab;
  height: 150px;
  line-height: 150px;
  margin: 25px;
  text-align: center;
  width: 150px;

  &:active {
    cursor: grabbing;
  }
`

const Rectangle = ({ value, order, children, innerProps }) => {
  // const element = React.useRef(null)
  return (
    <StyledRectangle
      order={ order }
      even={ value % 2 === 0 }
      { ...innerProps }
    >{ children }</StyledRectangle>
  )
}

const CustomDrag = ({ items }) => {
  const [listItems, setListItems] = React.useState(items)
  const [ dragList, dragItem, dragPlaceholder ] = useDrag()

  React.useEffect(() => {
    const handleDragStart = (e) => {
      // console.log('drag started at: ', e.detail.source)
    }
    window.addEventListener('usedrag-dragstart', handleDragStart)
    return () => window.removeEventListener('usedrag-dragstart', handleDragStart)
  }, [])
  
  React.useEffect(() => {
    const handleDragUpdate = (e) => {
      // console.log('drag update detected')
      // console.log('source: ', e.detail.source)
      // console.log('destination: ', e.detail.destination)
    }
    window.addEventListener('usedrag-dragupdate', handleDragUpdate)
    return () => window.removeEventListener('usedrag-dragupdate', handleDragUpdate)
  }, [])
  
  React.useEffect(() => {
    const handleDragEnd = ({detail: {source, destination}}) => {
      const newList = [...listItems]
      const el = newList.splice(source, 1)
      newList.splice(destination, 0, el)
      setListItems(newList)
    }
    window.addEventListener('usedrag-dragend', handleDragEnd)
    return () => window.removeEventListener('usedrag-dragend', handleDragEnd)
  }, [ listItems ])

  return (
    <Wrap ref={ dragList.innerRef }>
      { listItems.map((el, i) => (
        <Rectangle
          key={ el }
          order={ i }
          value={ el }
          innerProps={ dragItem(i).innerProps }
        >{ el }</Rectangle>
      )) }
      { dragPlaceholder }
    </Wrap>
  )
}

export default CustomDrag