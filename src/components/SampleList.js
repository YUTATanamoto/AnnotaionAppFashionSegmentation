import React from 'react';
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'


class SampleList extends React.Component{
  constructor(props) {
    super(props)
    this.state = {
                  scroll:true
                }
              }

  buttonClick(sample){
    this.setState({scroll:false}, ()=>{this.props.toEditor(sample)})
  }

  componentDidMount() {
    this.setState({scroll:true})
    window.scrollTo(0, this.state.scrollPosition);
    window.addEventListener('scroll', e => {console.log(this.state.scroll); if(this.state.scroll){console.log(window.pageYOffset);this.props.saveScrollPosition()}}, true)
  }

  render(){
    const styles = {
      cardContainer:{backgroundColor: '#FDFDFD', display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center"},
      card: {position:"relative", height: '230px', width:'150px', boxShadow: '5px 5px 5px #ececec'},
      cardImg:{position:'absolute'},
      cardBody:{position:'absolute', marginTop:"140px"},
      cardButton:{cursor: 'pointer', fontSize : "70%"}
    }

    const time = new Date().getTime()

    return(
      <div>
        <div style = {styles.cardContainer}>
          <link
          rel="stylesheet"
          href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
          integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T"
          crossOrigin="anonymous"
          />
          {this.props.sampleList.map((sample, index) => {
            return (
              <Card key = {index} style = {styles.card}>
                <div style = {styles.cardImgContainer}>
                <Card.Img variant="top" src={'thumbnail/' + sample} style = {styles.cardImg}/>
                {this.props.maskList.indexOf(sample.replace("jpg", "png")) >= 0 ? <Card.Img variant="top" src={'mask/' + sample.replace("jpg", "png") + '?' + time} style = {styles.cardImg}/> : <Card.Img variant="top" src='./blank.png' style = {styles.cardImg}/>}
                </div>
                <Card.Body style = {styles.cardBody}>
                <Card.Text style = {{fontSize : "45%"}}>
                {sample}
                </Card.Text>
                <Button style = {styles.cardButton} onClick={() => {this.buttonClick(sample)}}>Edit</Button>
                </Card.Body>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }
}

export default SampleList;
