import React from 'react';
import Link from "../components/Link";
import {Icon} from "../components/Header";
// import Avatar from "../components/Avatar";
import Management from "../utils/Management";
import Url from "../utils/Url";
import Events from "../utils/Events";
import Writing from "./view/Writing";
import Ressources from "../utils/Ressources";
import {io} from 'socket.io-client'
import Route from "../utils/Route";
import {
    BottomNavigation,
    BottomNavigationAction,
    Button, Avatar,
    Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem
} from "@mui/material";
import Filter from "../utils/Filter";

export default class Main extends React.Component{

    static socket = null;
    static branch = null;

    constructor(props) {
        super(props);
        this.list = [
            ["/","/writing","/studio","/communauty","/messenging"],
            ["/writing","/studio","/","/communauty","/messenging"]
        ];
        Main.retryConnection();
        this.routes = Management.getRoutes();
        this.mounted = false;
        this.branches = Main.getBranchOptions();
        Main.branch = Object.keys(Management.data.branches)[0] * 1;
        this.state = {
            route: Url.get(),
            expanded: false,
            back: false,
            bottomValue: 0,
            userMenu: null,
            branch: Main.branch,
            dialogBox: {
                open: false,
                title: null,
                content: '',
                forced: false
            }
        }
    }

    static getBranchOptions(){
        const source = Filter.toOptions(Management.data.branchesData, 'id', 'name');
        const branches = {};
        for(let i in Management.data.branches){
            branches[i] = source[i];
        }
        return branches;
    }

    static retryConnection(){
        Main.socket = io.connect(Ressources.apis);
        Main.socket.on("connected", ()=>{
            console.log('[Connected]');
            Events.emit('connected');
        })
    }

    static retryStorage(){

    }

    componentDidMount() {
        this.mounted = true;
        window.addEventListener("popstate", ()=>{
            Events.emit("nav");
        });
        if(!Management.data.token){
            return this.toggleDialogBox(true, true);
        }
        Management.watch().bind();
        Events.on("nav", ()=>{
            this.setState(state=>{
                return {
                    ...state,
                    route: Url.get()
                }
            })
        },this)
        .on('set-prev', (value)=>{
            this.setState(state=>{
                return {
                    ...state,
                    back: value
                }
            })
        },this)
        .on('personal-data-updated', ()=>{
            this.setState(state=>{
                return {...state}
            })
        })
        .on("logout-requirement", async ()=>{
            Management.data.token = null;
            await Management.commit();
            this.toggleDialogBox(true,true);
        })
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    changeBranch(e){
        Main.branch = e;
        Events.emit('branch-switch', e);
        this.setState(state => {
            return {
                ...state,
                userMenu: null,
                branch: e
            }
        })
    }

    static DialogBox(props){
        let {title = null} = props;
        return (
            <Dialog
                open={props.open}
                onClose={props.onClose}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {props.content}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    {
                        props.buttons
                    }
                </DialogActions>
            </Dialog>
        )
    }

    toggleDialogBox(open, forced=false){
        this.setState(state=>{
            return {
                ...state,
                dialogBox: {
                    ...state.dialogBox,
                    open: open,
                    forced
                }
            }
        })
    }

    static MenuList(props){
        return (
            <Menu
            anchorEl={props.el}
            onClose={props.onClose}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'right'
            }}
            sx={props.sx ? props.sx : {
                mt: '45px'
            }}
            open={Boolean(props.el)}
            >
                {
                    props.list.map((data,index)=>{
                        if(!data) return null;
                        return (
                            <MenuItem key={index} className={data.className} onClick={(e)=> {
                                return data.click ? data.click(e, props.onClose) : props.onClick ? props.onClick(e, props.onClose) : null
                            }}>
                                {
                                    data.component ? data.component : [data.icon, data.label]
                                }
                            </MenuItem>
                        )
                    })
                }
            </Menu>
        )
    }

    renderView(){
        let url = Url.get(),
            view = null;

        if(url == '/'){
            return this.routes["/"].view;
        }

        for(let route in this.routes){
            if(route == '/') continue;
            if(Url.match(route,url)){
                view = this.routes[route].view;
            }
        }
        return view;
    }

    renderSideMenu(){
        return (
            <div className="ui-fluid-height sidemenu ui-hide ui-md-element ui-all-center">
                <div className="ui-container ui-size-fluid user-zone ui-vertical-center">
                    <Button className="ui-element toggler"
                        onClick={()=>{
                            this.setState(state => {
                                return {
                                    ...state,
                                    expanded: !state.expanded
                                }
                            })
                        }}
                    >
                        <Icon icon="bars"/>
                    </Button>
                </div>
                {
                    this.list[0].map((key,index)=>{
                        let active = (this.state.route == key && key == '/') || (Url.match(key,this.state.route) && key != '/');
                        if(this.routes[key].privilege && !Management.isGranted(this.routes[key].privilege)) return null;
                        return (
                            <Link href={key} key={index} className={
                                "ui-container ui-all-center ui-size-fluid ui-unwrap link ui-nowrap " +
                                (active ? 'active' : '')
                            }>
                                <Icon icon={this.routes[key].icon}/>
                                <div className="ui-element text ui-nowrap ui-text-ellipsis">
                                    {this.routes[key].text}
                                </div>
                            </Link>
                        )
                    })
                }
                <Link href="/usr" className="ui-container ui-size-fluid user-zone ui-horizontal-center ui-vertical-bottom">
                    <IconButton>
                        <Avatar className="avatar" src={Management.data.avatar} size={"30px"}>
                            {Management.data.firstname[0].toUpperCase()}
                        </Avatar>
                    </IconButton>
                </Link>
            </div>
        );
    }

    renderHeader(){
        return (
            <div className="ui-container ui-size-fluid view-app-bar ui-vertical-center">
                <div className="ui-container ui-size-2 ui-md-size-1 ui-all-center prev">
                    <IconButton
                        sx={{width: '43px'}}
                        onClick={()=>{
                            Route.back();
                        }}
                    >
                        <Icon icon="arrow-left"
                              className={"back-to-prev "+(this.state.back ? '' : 'ui-hide')}
                        />
                    </IconButton>
                </div>
                <div className="ui-container ui-size-5 title">
                    {Management.getProjectName()}
                </div>
                <div className="ui-container ui-vertical-center ui-unwrap ui-size-5 ui-md-size-6 ui-horizontal-right appbar-icons">
                    <IconButton>
                        <Icon icon="bell"/>
                    </IconButton>
                    <IconButton onClick={(e)=>{
                        this.setState(state=>{
                            return {
                                ...state,
                                userMenu: e.target
                            }
                        })
                    }}>
                        <Avatar className="avatar" src={Management.data.avatar} size={"34px"}>
                            {Management.data.firstname[0].toUpperCase()}
                        </Avatar>
                    </IconButton>
                    <div className="ui-container ui-size-5 ui-md-size-4 user-info">
                        <label className="ui-container ui-size-fluid name">{Management.data.firstname}</label>
                        <label className="ui-container ui-size-fluid nick">{Management.data.nickname}</label>
                    </div>
                    <Main.MenuList
                        el={this.state.userMenu}
                        onClose={()=>{
                            this.setState(state=>{
                                return {...state, userMenu: null};
                            })
                        }}
                        list={[
                            {
                                component: (
                                    <Writing.RenderSelect
                                        label="Filiale"
                                        variant="outlined"
                                        className="ui-size-fluid"
                                        onChange={(e)=>this.changeBranch(e.target.value)}
                                        sx = {{
                                            height: 30
                                        }}
                                        value={this.state.branch}
                                        list={this.branches}
                                    />
                                )
                            },
                            {
                                icon: <Icon icon="user"/>,
                                className: 'option-item',
                                label: "Mon compte",
                                click: ()=>{
                                    this.setState(state=>{
                                        return {...state, userMenu: null};
                                    });
                                    Route.pushState("/usr");
                                }
                            },
                            !Management.isGranted(300) ? null :
                            {
                                icon: <Icon icon="cog"/>,
                                className: 'option-item',
                                label: "Gestion du site",
                                click: ()=>{
                                    this.setState(state=>{
                                        return {...state, userMenu: null};
                                    });
                                    Route.pushState("/settings");
                                }
                            },
                            {
                                icon: <Icon icon="sign-out-alt"/>,
                                label: "Déconnexion",
                                className: 'option-item',
                                click: ()=>{
                                    this.setState(state=>{
                                        return {...state, userMenu: null};
                                    })
                                    this.toggleDialogBox(true)
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        )
    }

    renderBottomNavBar(){
        let route = "/";
        this.list[0].forEach((val)=>{
            route = (this.state.route == val && val == '/') || (Url.match(val,this.state.route) && val != '/') ? val : route;
        });
        return (
            <div className="ui-size-fluid view-bottom-bar ui-absolute ui-bottom-close ui-left-close ui-md-hide">
                <BottomNavigation value={route} showLabels onChange={(ev,value)=>{
                    Route.pushState(value);
                }}>
                    {
                        this.list[1].map((key,index)=>{
                            let active = (this.state.route == key && key == '/') || (Url.match(key,this.state.route) && key != '/');
                            if(this.routes[key].privilege && !Management.isGranted(this.routes[key].privilege)) return null;
                            return (
                                <BottomNavigationAction
                                    className="link"
                                    value={key}
                                    label={this.routes[key].text}
                                    icon={<Icon icon={this.routes[key].icon}/>}
                                />
                            )
                        })
                    }
                </BottomNavigation>
            </div>
        )
    }

    render() {
        return (
            <>
                <div className={"ui-container ui-vfluid "+(this.state.expanded ? 'expanded' : '')} id="main-panel">
                    {this.renderSideMenu()}
                    <div className="ui-container ui-fluid-height view-wrapper ui-relative">
                        {this.renderHeader()}
                        <div className="ui-container ui-size-fluid view-body">
                            {this.renderView()}
                        </div>
                        {this.renderBottomNavBar()}
                    </div>
                </div>
                <Main.DialogBox
                    title="Déconnexion"
                    open={this.state.dialogBox.open}
                    content="Vous allez vous déconnecter !"
                    buttons={[
                        (
                            this.state.dialogBox.forced ? null:
                            <Button variant="text" onClick={()=>{
                                this.toggleDialogBox(false);
                            }}>Annuler</Button>
                        ),
                        <Button variant="text" onClick={()=>{
                            this.toggleDialogBox(false);
                            Management.storage.setItem('agent', null).then(()=>{
                                Events.emit('reset-view');
                                Route.pushState('/');
                                Main.socket.close();
                            });
                        }}>Oui</Button>
                    ]}
                />
            </>
        );
    }
}