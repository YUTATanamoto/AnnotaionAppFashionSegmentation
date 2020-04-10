import React from 'react';
import Button from 'react-bootstrap/Button'
import { FaArrowsAlt, FaCircle, FaPen, FaFillDrip, FaHandPointUp, FaRegHandPointUp, FaCompress, FaCompressArrowsAlt, FaExpand, FaExpandArrowsAlt, FaEraser, FaUndo, FaRedo, FaBrain, FaEyeSlash, FaEye, FaTh, FaArrowLeft, FaArrowRight} from 'react-icons/fa'


class Editor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
                  drawing: false,
                  saving: false,
                  fillAlpha:0.3,
                  display:true,

                  scale:1,
                  originX:0,
                  originY:0,
                  scrollLeft:0,
                  scrollTop:0,

                  editor:"tanamoto",
                  operation:"draw",
                  color:"#0F0",
                  coordinates:[],
                  redoStack:[],

                  startTime:0,
                  endTime:0,
                  editLog: [],
                  editLogAll: [],

                  canvasOpacity:1,
                }

              }

  getSamples() {
    const fetch = require('node-fetch')
    fetch('/api/samples')
    .then(res =>res.json())
    .then(json=>{this.setState({sampleList:json["fileList"], maskList:json["maskList"]})})
  }

  getContext() {
    return this.refs.canvas.getContext('2d')
  }

  startDrawing(e) {
    const scale = this.state.scale
    let x=(e.touches[0].pageX-e.target.getBoundingClientRect().left)/scale
    let y=(e.touches[0].pageY-e.target.getBoundingClientRect().top)/scale
    if(x<0){x=0}
    else if(x>this.refs.canvas.width){x=this.refs.canvas.width}
    if(y<0){y=0}
    else if(y>this.refs.canvas.width){y=this.refs.canvas.width}
    const ctx = this.getContext()
    this.setState({ drawing: true })
    ctx.beginPath()
    ctx.moveTo(x, y)
    e.stopPropagation()
    e.preventDefault()
    const coordinates = []
    const time = new Date().getTime()
    coordinates.push([x, y, scale, time])
    this.setState({coordinates: coordinates})
  }

  draw(e) {
    const scale = this.state.scale
    if(!this.state.drawing){
      return
    }
    let x=(e.touches[0].pageX-e.target.getBoundingClientRect().left)/scale
    let y=(e.touches[0].pageY-e.target.getBoundingClientRect().top)/scale
    if(x<0){x=0}
    else if(x>this.refs.canvas.width){x=this.refs.canvas.width}
    if(y<0){y=0}
    else if(y>this.refs.canvas.height){y=this.refs.canvas.height}
    const ctx = this.getContext()
    ctx.strokeStyle = this.state.color
    ctx.globalCompositeOperation = "destination-out"
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineTo(x, y)
    ctx.stroke()
    const coordinates = this.state.coordinates
    const time = new Date().getTime()
    coordinates.push([x, y, scale, time])
    this.setState({coordinates: coordinates})
    e.stopPropagation()
    e.preventDefault()
  }

  endDrawing(e) {
    const ctx = this.getContext()
    ctx.closePath()
    const coordinates = this.state.coordinates
    const startPoint = this.state.startPoint
    const endPoint = coordinates.slice(-1)[0]
    const distThresh = 20
    const color = this.state.color
    const editor = this.state.editor
    const operation = this.state.operation
    const editLog = this.state.editLog
    const editLogAll = this.state.editLogAll
    // const dist = Math.sqrt(Math.pow(endPoint[0]-startPoint[0], 2)+Math.pow(endPoint[1]-startPoint[1], 2))
    editLog.push({editor: editor, operation: operation, color:color, coordinates: coordinates})
    editLogAll.push({editor: editor, operation: operation, color:color, coordinates: coordinates})
    this.setState({editLog: editLog, editLogAll: editLogAll})
    this.fillInsideLine(color, coordinates)
    this.setState({ drawing: false, coordinates:[], redoStack:[]})
  }

  touchAndFill(e){
    const scale = this.state.scale
    const startX= parseInt((e.touches[0].pageX-e.target.getBoundingClientRect().left)/scale)
    const startY= parseInt((e.touches[0].pageY-e.target.getBoundingClientRect().top)/scale)
    const color = this.state.color
    const editor = this.state.editor
    const operation = this.state.operation
    const editLog = this.state.editLog
    const editLogAll = this.state.editLogAll
    const time = new Date().getTime()
    this.floodFill(color, [startX, startY])
    editLog.push({editor: editor, operation: operation, color:color, coordinate: [startX, startY, scale, time]})
    editLogAll.push({editor: editor, operation: operation, color:color, coordinate: [startX, startY, scale, time]})
    this.setState({editLog: editLog, editLogAll: editLogAll, redoStack:[]})
  }

  fillInsideLine(color, coordinates){
    const ctx = this.getContext()
    ctx.fillStyle = color
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "destination-out"
    ctx.beginPath()
    ctx.moveTo(coordinates[0][0], coordinates[0][1])
    for (let coordinateProperty in coordinates.slice(1)){
      ctx.lineTo(coordinates[coordinateProperty][0], coordinates[coordinateProperty][1])
      ctx.stroke()
    }
    ctx.closePath()
    ctx.fill()

    if(color!=="#FFF"){
      ctx.strokeStyle=color
      ctx.fillStyle=color
      if (color==="#000"){
        ctx.globalAlpha=1
      }else{ctx.globalAlpha=this.state.fillAlpha}
      ctx.globalCompositeOperation = "source-over"
      ctx.beginPath()
      ctx.moveTo(coordinates[0][0], coordinates[0][1])
      for (let coordinate_property in coordinates.slice(1)){
        ctx.lineTo(coordinates[coordinate_property][0], coordinates[coordinate_property][1])
        ctx.stroke()
      }
      ctx.closePath()
      ctx.fill()
    }
  }

  floodFill(color, coordinate){
    const startX = coordinate[0]
    const startY = coordinate[1]
    const ctx = this.getContext()
    const src = ctx.getImageData(0, 0, this.refs.canvas.width, this.refs.canvas.height)
    let startIndex = this.coord2index(startX, startY)
    const point = {x: startX, y: startY}
    const buf = []
    const targetColorList = [src.data[startIndex], src.data[startIndex+1], src.data[startIndex+2],  src.data[startIndex+3]]
    buf.push(point)
    let count = 0
    while (buf.length > 0){
      const target = buf.pop()
      const index = this.coord2index(target.x, target.y)
      const colorList=[src.data[index], src.data[index+1], src.data[index+2], src.data[index+3]]
      if (target.x < 0 || target.x >= this.refs.canvas.width || target.y < 0 || target.y >= this.refs.canvas.height){
        continue
      }
      if (((colorList[0] === targetColorList[0]) && (colorList[1] === targetColorList[1]) && (colorList[2] === targetColorList[2]) && (targetColorList[0]+targetColorList[1]+targetColorList[2])!==0) ||
       ((colorList[0] === targetColorList[0]) && (colorList[1] === targetColorList[1]) && (colorList[2] === targetColorList[2]) && (colorList[3] === targetColorList[3]) && (targetColorList[0]+targetColorList[1]+targetColorList[2])===0)) {
        src.data[index] = this.color2list(color)[0]
        src.data[index+1] = this.color2list(color)[1]
        src.data[index+2] = this.color2list(color)[2]
        src.data[index+3] = this.color2list(color)[3]
        buf.push({ x: target.x - 1, y: target.y })
        buf.push({ x: target.x, y: target.y + 1 })
        buf.push({ x: target.x + 1, y: target.y })
        buf.push({ x: target.x, y: target.y - 1 })
     }
     count ++
     if(count>2000000){break}
    }
    ctx.putImageData(src, 0, 0)
  }

  fromData(data){
    const maskImage = new Image()
    maskImage.src = "maskFromUnet/"+this.props.sampleName.replace("jpg", "png")
    maskImage.onload = ()=> {
      for(let index in data){
        const editLog_ = data[index]
        const operation = editLog_.operation
        if(operation === "draw"){
          const color = editLog_.color
          const coordinates = editLog_.coordinates
          this.fillInsideLine(color, coordinates)
        }else if (operation === "fill") {
          const color = editLog_.color
          const coordinate = editLog_.coordinate
          this.floodFill(color, coordinate)
        }else if (operation === "setMaskFromUnet"){
          const ctx = this.getContext()
          this.clearCanvas(this);
          ctx.globalCompositeOperation = "source-over"
          ctx.globalAlpha=1
          ctx.drawImage(maskImage,0,0,this.refs.canvas.width,this.refs.canvas.height)
        }
      }
    }
  }

  coord2index(x, y){
    return(4*y*this.refs.canvas.width+4*x)
  }

  color2list(color){
    let colorList=[]
    if (color==="#0FF"){colorList = [0, 255, 255, 255*this.state.fillAlpha]}
    else if (color==="#0F0") {colorList = [0,255, 0, 255*this.state.fillAlpha]}
    else if (color==="#00F") {colorList = [0,0, 255, 255*this.state.fillAlpha]}
    else if (color==="#000") {colorList = [0, 0, 0, 255*this.state.fillAlpha]}
    else if (color==="#FFF") {colorList = [255, 255, 255, 0]}
    return(colorList)
  }

  clearCanvas(){
    const ctx = this.getContext()
    ctx.clearRect(0,0,this.refs.canvas.width,this.refs.canvas.height)
  }

  resetState(){
    this.setState({canvasOpacity:1, editLog:[], editLogAll:[], coordinates:[], color:"#0F0", redoStack:[], scale:1})
  }

  addToLog(data){
    const editLogAll = this.state.editLogAll
     editLogAll.push(data)
    this.setState({ editLogAll:  editLogAll})
  }

  undo(){
    if(this.state.editLog.length>0){
      const editLog = this.state.editLog
      const editor = this.state.editor
      const time = new Date().getTime()
      const editLogAll = this.state.editLogAll
      const redoStack = this.state.redoStack
      editLogAll.push({editor: editor, operation: "undo", time: time})
      this.setState({editLogAll: editLogAll})
      redoStack.push(editLog.pop())
      this.setState({editLog: editLog, redoStack: redoStack})

      const ctx = this.getContext()
      const maskImage = new Image()
      if(this.props.maskList.indexOf(this.props.sampleName.replace("jpg", "png")) >= 0){
        maskImage.src = "mask/"+this.props.sampleName.replace("jpg", "png")
      }else{
        maskImage.src = "maskFromUnet/"+this.props.sampleName.replace("jpg", "png")
      }
      maskImage.onload = ()=> {
        this.fillInsideLine("#FFF", [[0,0], [this.refs.canvas.width,0], [this.refs.canvas.width,this.refs.canvas.height], [0,this.refs.canvas.height], [0,0]])
        ctx.globalCompositeOperation = "source-over"
        ctx.globalAlpha=1
        ctx.drawImage(maskImage,0,0,this.refs.canvas.width,this.refs.canvas.height)
        this.fromData(editLog)
      }
    }
  }

  redo(){
    if(this.state.redoStack.length>0){
      const editLog = this.state.editLog
      const redoStack = this.state.redoStack
      editLog.push(redoStack.pop())
      this.setState({editLog: editLog, redoStack: redoStack})

      const editor = this.state.editor
      const time = new Date().getTime()
      const editLogAll = this.state.editLogAll
      this.fromData(editLog.slice(-1))

      editLogAll.push({editor: editor, operation: "redo", time: time})
      this.setState({editLogAll: editLogAll})
    }
  }

  toggleMask(){
    if (this.state.display){
      this.setState({canvasOpacity:0})
      this.setState({display:false})
    }
    else if (!this.state.display){
      this.setState({canvasOpacity:1})
      this.setState({display:true})
    }
  }

  setMask(src) {
    const ctx = this.getContext()
    const maskImage = new Image()
    maskImage.src = src
    maskImage.onload = ()=> {
      this.clearCanvas(this);
      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha=1
      ctx.drawImage(maskImage,0,0,this.refs.canvas.width,this.refs.canvas.height)
    }
  }

  setMaskLogger(){
    const editor = this.state.editor
    const time = new Date().getTime()
    const editLog = this.state.editLog
    const editLogAll = this.state.editLogAll
    editLog.push({editor: editor, operation: "setMaskFromUnet", time: time})
    editLogAll.push({editor: editor, operation: "setMaskFromUnet", time: time})
    this.setState({editLog: editLog, editLogAll: editLogAll})
  }

  // save(){
  //   const canvas=this.refs.canvas
  //   const dataURL = canvas.toDataURL()
  //   const fetch = require('node-fetch');
  //   fetch('/api/save', {
  //     method: 'POST',
  //     headers: {'Content-Type': 'application/json'},
  //     body: JSON.stringify(Object.assign(Object.assign({}, this.state), {
  //     })),
  //   })
  // }

  toSampleList(){
    const time = new Date().getTime()
    const canvas=this.refs.canvas
    const dataURL = canvas.toDataURL()
    const fetch = require('node-fetch')
    this.setState({endTime:time}, ()=>{
      fetch('/api/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.assign(Object.assign({}, this.state), {
          startTime: this.state.startTime,
          endTime: this.state.endTime,
          image:dataURL,
          imageName:this.props.sampleName,
          editLog:this.state.editLogAll,
        })),
      })
      .then(()=>{this.props.toSampleList()})
    })
  }

  componentDidMount() {
    const time = new Date().getTime()
    this.setState({startTime: time})
    if(this.props.maskList.indexOf(this.props.sampleName.replace("jpg", "png")) >= 0){
      this.setMask("mask/"+this.props.sampleName.replace("jpg", "png"))
    } else{
      this.setMask("maskFromUnet/"+this.props.sampleName.replace("jpg", "png"))
      this.setMaskLogger();
    }

    const canvas = this.refs.canvas
    const canvasContainer = this.refs.canvasContainer
    canvasContainer.addEventListener("scroll", ()=>{this.setState({scrollLeft:canvasContainer.scrollLeft, scrollTop:canvasContainer.scrollTop})})
    if (this.state.operation!=="scroll"){
      canvas.addEventListener("touchstart", (e)=>{if(this.state.operation==="draw"){this.startDrawing(e)} else if(this.state.operation==="fill"){this.touchAndFill(e)}}, {passive:false})
      canvas.addEventListener("touchmove", (e)=>{if(this.state.operation==="draw"){this.draw(e)}}, {passive:false})
      canvas.addEventListener("touchend", (e)=>{if(this.state.operation==="draw"){this.endDrawing(e)}}, {passive:false})
    }
  }


  render() {
    const styles = {
      nameForm:{border:"solid 0px", width:"20em"},
      magnification:{arginLeft:"0px",width:"50px", border:"solid 0px"},

      canvasContainer: {overflow:`${this.state.scale !== 1 ? "scroll" : "hidden"}`, position: 'relative', width:"640px", height:"640px", marginRight:"30px"},
      canvas:{position:'absolute', opacity:`${this.state.canvasOpacity}`, transformOrigin:`${this.state.originX}% ${this.state.originY}%`, transform:`scale(${this.state.scale})`},
      img: {position:'absolute', width:"630px", height:"630px", transformOrigin:`${this.state.originX}% ${this.state.originY}%`, transform:`scale(${this.state.scale})`},

      subImageContainer:{position:"relative", overflow:"hidden", width:"630px", height:"630px"},
      subImage: {zIndex:"1", position:"absolute", width:"630px", height:"630px", marginTop:"0px", marginLeft:"0px", transformOrigin:`${this.state.originX}% ${this.state.originY}%`,},
      rect1:{zIndex:"10", position:"absolute", backgroundColor:"rgba(0,0,0,0.5)", marginLeft:`0px`,  marginTop:`0px`, width:`630px`, height:`${this.state.scrollTop/this.state.scale}px`},
      rect2:{zIndex:"10", position:"absolute", backgroundColor:"rgba(0,0,0,0.5)", marginLeft:`0px`,  marginTop:`${this.state.scrollTop/this.state.scale}px`, width:`${this.state.scrollLeft/this.state.scale}px`, height:`${630/this.state.scale}px`},
      rect3:{zIndex:"10", position:"absolute", backgroundColor:"rgba(0,0,0,0.5)", marginLeft:`${this.state.scrollLeft/this.state.scale+630/this.state.scale}px`,  marginTop:`${this.state.scrollTop/this.state.scale}px`, width:`${630-this.state.scrollLeft/this.state.scale-630/this.state.scale}px`, height:`${630/this.state.scale}px`},
      rect4:{zIndex:"10", position:"absolute", backgroundColor:"rgba(0,0,0,0.5)", marginLeft:`0px`,  marginTop:`${this.state.scrollTop/this.state.scale+630/this.state.scale}px`, width:`630px`, height:`${630-this.state.scrollTop/this.state.scale-630/this.state.scale}px`},

      buttonContainer: {margin: '0px', marginLeft:'40px'},
      button: {cursor: 'pointer', margin: '5px', width:"40px", height:"40px", color: "#444"},
      greenButton: {cursor: 'pointer', margin: '5px', color: 'green',width:"40px",height:"40px"},
      blueButton: {cursor: 'pointer', margin: '5px', color: 'blue',width:"40px",height:"40px"},
      blueGreenButton: {cursor: 'pointer', margin: '5px', color: '#0FF',width:"40px",height:"40px"},
      blackButton: {cursor: 'pointer', margin: '5px', color: 'black',width:"40px",height:"40px"},
      brain: {cursor: 'pointer', margin: '5px', width:"40px", height:"40px", color:"#0FF"},
    }
    const iconSize="80%"

   return (
     <div style={{marginTop:"50px"}}>
     <div style = {{width:"100%", display: "flex", flexDirection: "row", justifyContent: "center"}}>
     <input type="text" value={this.props.sampleName} style={styles.nameForm}/>
     <input type="text" value={`x${this.state.scale}`} style={styles.magnification}/>
     </div>
       <div>
         <div style = {{width:"100%", display: "flex", flexDirection: "row", justifyContent: "center"}}>
         <div style={styles.canvasContainer} ref="canvasContainer">
         <img src={"image/"+this.props.sampleName} style={styles.img} alt={this.props.sampleName}/>
         <canvas
         className="canvas"
         ref="canvas"
         width="630px"
         height="630px"
         style={styles.canvas}
         >
         </canvas>
         </div>
         <div style={styles.subImageContainer}>
         <div style={styles.rect1}></div>
         <div style={styles.rect2}></div>
         <div style={styles.rect3}></div>
         <div style={styles.rect4}></div>
         <img src={"image/"+this.props.sampleName} style={styles.subImage} alt={this.props.sampleName}/>
         </div>
         </div>
         <div style={styles.buttonContainer}>
         <Button variant="outline-secondary" style={styles.button}>{this.state.operation === "scroll"?<FaHandPointUp size={iconSize}/>:this.state.operation==="fill"?<FaFillDrip size={iconSize} style={{color:this.state.color}}/>:<FaPen size={iconSize} style={{color:this.state.color}}/>}</Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.setState({operation:"draw"})}}><FaPen style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.setState({operation:"fill"})}}><FaFillDrip style = {{margin:"auto"}}size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.setState({operation:"scroll"})}}><FaHandPointUp style = {{margin:"auto"}}size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {let scale=this.state.scale; if(scale>=1.25){this.setState({scale:scale-0.25})}}}><FaCompressArrowsAlt style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {let scale=this.state.scale; this.setState({scale:scale+0.25})}}><FaExpandArrowsAlt style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.greenButton} onClick={() => {this.setState({color: '#0F0'})}}><FaCircle style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.blueButton} onClick={() => {this.setState({color: '#00F'})}}><FaCircle style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.blueGreenButton} onClick={() => {this.setState({color: '#0FF'})}}><FaCircle style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.blackButton} onClick={() => {this.setState({color: '#000'})}}><FaCircle style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.setState({color: '#FFF'})}}><FaEraser style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.undo(this)}}><FaUndo style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.redo(this)}}><FaRedo style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.toggleMask(this)}}>{this.state.display ? <FaEyeSlash style = {{margin:"auto"}} size={iconSize}/> : <FaEye size={iconSize}/>}</Button>
         <Button variant="outline-secondary" style={styles.brain} onClick={() => {this.clearCanvas(this); this.setMask("maskFromUnet/"+this.props.sampleName.replace("jpg", "png")); this.setMaskLogger(); this.setState({ drawing: false, coordinates:[], redoStack:[]})}}><FaBrain style = {{margin:"auto"}} size={iconSize}/></Button>
         <Button variant="outline-secondary" style={styles.button} onClick={() => {this.toSampleList()}}><FaTh style = {{margin:"auto"}} size = {iconSize}/></Button>
         </div>
       </div>
     </div>
   )
  }
}

export default Editor;
