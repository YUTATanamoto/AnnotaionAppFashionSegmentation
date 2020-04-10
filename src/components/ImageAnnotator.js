import React from 'react';
import MyAppBar from './MyAppBar'
import SampleList from './SampleList'
import Editor from'./Editor'


class ImageAnnotator extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
                  applicationMode:"starting",
                  sampleList:[],
                  maskList:[],
                  matchedList:[],
                  imgSrc:"",
                  targetStr:"",
                  editor:"tanamoto",
                  operation:"draw",
                  color:"#0F0",
                  EditorOpacity:1,
                  scrollPosition:0,
                  Log:[],
                  revisedList:[]
                }

              }

  getSamples() {
    const fetch = require('node-fetch')
    fetch('/api/samples')
    .then(res =>res.json())
    .then(json=>{this.setState({sampleList:json["fileList"], maskList:json["maskList"]}, this.segmentation(this.state.samplleList))})
  }

  segmentation(){
    if(this.state.maskList.length!==this.state.sampleList){
      const fetch = require('node-fetch');
      fetch('/api/segmentation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.assign(Object.assign({}, this.state), {
          imageName:this.state.sampleList,
        })),
      }).then(res=>res.json())
      .then(json=>{console.log(json["message"]); this.setState({applicationMode:"sampleList"});})
    }
  }

  toEditor=(sample)=>{
    const time = new Date().getTime()
    this.setState({startTime: time, applicationMode:"editor", imgSrc:sample, isFirstEdit:true})
  }

  toSampleList=()=>{
    const maskList = this.state.maskList
    maskList.push(this.state.imgSrc.replace("jpg", "png"))
    const revisedList = this.state.revisedList
    revisedList.push(this.state.imgSrc)
    this.setState({applicationMode:"sampleList", maskList: maskList, revissedList: revisedList},()=>{window.scrollTo(0, this.state.scrollPosition)})
  }

  searchOnChange=(e)=>{
    const targetStr = e.target.value
    const matchedList = []
    const sampleList = this.state.sampleList
    sampleList.map((sampleName)=>{
      if(sampleName.indexOf(targetStr)>=0){
        matchedList.push(sampleName)
      }
    })
    this.setState({matchedList:matchedList, targetStr:targetStr})
  }

  saveScrollPosition=()=>{
    const scrollPosition = Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop);
    this.setState({scrollPosition: scrollPosition})
  }

  componentDidMount() {
    this.getSamples()
  }

  render() {
    const styles = {
      samplelistContaier:{paddingTop:"80px"},
      editorContainer:{}
    }

   if(this.state.applicationMode==="editor"){
     return (
       <div style={styles.editorContainer}>
        <Editor sampleName={this.state.imgSrc} toSampleList={this.toSampleList} maskList={this.state.maskList}/>
       </div>
     )
   }else if(this.state.applicationMode==="sampleList"){
     return(
       <div>
         <div style = {{zIndex:"1", position:"fixed", width:"100%"}}>
          <MyAppBar searchOnChange={this.searchOnChange} value={this.state.targetStr}/>
         </div>
         <div style={styles.samplelistContaier}>
          {this.state.targetStr.length > 0 ? (this.state.matchedList.length>0 ? <SampleList sampleList={this.state.matchedList} maskList={this.state.maskList} toEditor={this.toEditor} saveScrollPosition={this.saveScrollPosition}/>:<div>Sorry, there is no matced sample.......</div> ): <SampleList sampleList={this.state.sampleList} maskList={this.state.maskList} toEditor={this.toEditor} saveScrollPosition={this.saveScrollPosition}/>}
         </div>
       </div>
     )
   }else{
     return(
       <div>LOADING...</div>
     )
   }
  }
}

export default ImageAnnotator;
