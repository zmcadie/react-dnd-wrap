import React, { useState } from 'react'
import styled from "styled-components";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const itemMargin = 25

const UL = styled.ul`
  border: 1px solid #ff6040;
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: ${itemMargin}px;
  width: fit-content;
  transition: width 200ms;
`;

const LI = styled.li`
  border-radius: 8px;
  background: ${p => (p.highlight ? "#4060ff" : "#ff6040")};
  color: white;
  height: 150px;
  line-height: 150px;
  margin: ${itemMargin}px;
  order: ${p => p.order};
  padding: 0;
  width: 150px;
  transition: order 200ms;
  text-align: center;
`;

const PH = styled.span`
  /* background: #0004; */
  order: ${p => p.order};
`;

function getStyle(style, snapshot, dragPosition) {
  // console.log("draggable snapshot: ", snapshot);
  if (!snapshot.isDropAnimating) {
    return style
  }
  // patching the existing style
  return {
    ...style,
    order: dragPosition
  };
}

const Item = ({ value, index, order, dragPosition, type }) => {
  return (
    <Draggable draggableId={value} index={index}>
      {(provided, snapshot) => {
        return (
          <LI
            id={`${type}-${index}`}
            order={order}
            highlight={value === 1}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getStyle(provided.draggableProps.style, snapshot, dragPosition)}
          >
            {value}
          </LI>
        );
      }}
    </Draggable>
  );
};

const debounce = (cb, time) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => cb(...args), time)
  }
}

const Board = ({ items: initialItems, id="board" }) => {
  const [items, setItems] = React.useState(initialItems);
  const [draggingItem, setDraggingItem] = React.useState()
  const [dragPosition, setDragPosition] = React.useState(null);
  const [listWrap, setListWrap] = React.useState();

  const draggingRef = React.useRef(null)
  const listRef = React.useRef(null)
  
  React.useEffect(() => {
    const getListWrap = () => Math.floor(listRef.current.offsetWidth / 200)
    setListWrap(getListWrap())
    const handleResize = debounce(() => setListWrap(getListWrap()), 500)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [ id ])

  const handleDragStart = ({ source: { index } }) => {
    setDragPosition(index)
    draggingRef.current = document.getElementById(`item-${index}`)
  }
  
  const handleDragUpdate = (update) => {
    const { destination } = update
    if (!destination) return
    const listBounds = listRef.current.getBoundingClientRect()
    const dragBounds = draggingRef.current.getBoundingClientRect()
    console.log('list: ', listBounds)
    console.log('drag: ', dragBounds)
    const posX = Math.trunc((dragBounds.x - listBounds.x + (dragBounds.width / 2)) / (dragBounds.width + (itemMargin * 2)))
    const posY = Math.trunc((dragBounds.y - listBounds.y + (dragBounds.height / 2)) / (dragBounds.height + (itemMargin * 2)))
    console.log(posX)
    console.log(posY)
    console.log('index: ', posX + listWrap * posY)
    // const {index: oldIndex} = source
    // const {index: newIndex} = destination
    // const position = newIndex > oldIndex ? newIndex + 1 : newIndex
    // setDragPosition(position)
  }

  const handleDragEnd = ({ source }) => {
    // console.log("drag position: ", dragPosition)
    // console.log("source position: ", source.index)
    if (dragPosition === source.index) return;
    const { index: oldIndex } = source;
    const newItems = [...items];
    const item = newItems.splice(oldIndex, 1)[0];
    newItems.splice(dragPosition, 0, item);
    setItems(newItems);
    draggingRef.current = null
  }

  const getOrder = (index) => (
    Number.isInteger(dragPosition) && index > dragPosition
      ? index - 1
      : index
  )

  const setListRef = innerRef => {
    return ref => {
      listRef.current = ref
      innerRef(ref)
    }
  }

  return (
    <div>
      <DragDropContext
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEnd}
      >
        <Droppable droppableId="drop" direction="horizontal">
          {(provided, snapshot) => {
            return (
              <UL id={id} ref={setListRef(provided.innerRef)} {...provided.droppableProps}>
                {items.map((item, index) => {
                  return (
                    <Item
                      key={item}
                      value={item}
                      index={index}
                      order={getOrder(index)}
                      dragPosition={dragPosition}
                      type="item"
                      // order={index}
                    />
                  )
                })}
                {/* <PH order={items.length + 1} style={{background: "transparent"}}>{provided.placeholder}</PH> */}
                <PH order={ items.length + 1 }>{provided.placeholder}</PH>
              </UL>
            );
          }}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default Board