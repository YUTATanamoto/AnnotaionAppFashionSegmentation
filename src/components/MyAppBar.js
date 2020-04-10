import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import InputBase from '@material-ui/core/InputBase';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';



class MyAppBar extends React.Component{
  render(){
    return (
      <div style={{diplay:"flex"}}>
      <AppBar position="static" >
      <Toolbar children={<IconButton>sample</IconButton>}>
      <IconButton
      edge="start"
      color="inherit"
      aria-label="open drawer"
      >
      <MenuIcon />
      </IconButton>
      <Typography variant="h6" noWrap>
      Image Annotator
      </Typography>
      <div onClick={this.props.searchOnClick} style={{marginLeft:"auto"}}>
      <SearchIcon />
      <InputBase
      placeholder="Search…"
      inputProps={{ 'aria-label': 'search' }}
      onChange={(e)=>{this.props.searchOnChange(e)}}
      value = {this.props.value}
      />
      </div>
      </Toolbar>
      </AppBar>
      </div>
    );
  }
}

export default MyAppBar
