import React, {createRef} from 'react';
import {CKEditor} from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import Events from "../../utils/Events";
import UploadAdapter from "../../utils/UploadAdapter";
import Main from "../Main";
import {Button, TextField, Box, IconButton, Grid, Switch} from "@mui/material";
import Management from "../../utils/Management";
import Writing from "./Writing";
import AlertableComponent from "./AlertableComponent";
import Route from "../../utils/Route";
import {Icon} from "../../components/Header";
import BlankLoader from "../widget/BlankLoader";
import Url from "../../utils/Url";
import AkaDatetime from '../../utils/AkaDatetime';
import Scheduler from "../widget/Scheduler";
import parser from "html-react-parser";


export default class Redactor extends AlertableComponent{

    constructor(props) {
        super(props);
        this.page = createRef();
        this.state = {
            ...super.getState(),
            title: '',
            content: '',
            date: '',
            time: '',
            publishauto: false,
            categories: {},
            category: '',
            loading: true,
            img: [],
            openConfig: false,
            edit: null,
            readOnly: false
        }
    }

    reload(){
        Management.getArticlesCategory().then(data => {
            const r = {};
            for(let i in data){
                r[data[i].id] = data[i].name;
            }
            this.setState(state => {
                return {
                    ...state,
                    categories: r
                }
            });
        }).catch(this.setReloadable.bind(this));
        let edition = /^\/writing\/new\/((?:dft-)?[0-9]+)/.test(Url.get());
        if(!edition){
            return this.updateData('loading', false);
        }
        const id = RegExp.$1;
        if(!/^[0-9]/.test(id)){
            const data = Management.getDraft(id.replace(/dft-/, ''));
            if(!data){
                return Route.back();
            }
            console.log('[Data]',data);
            //ban for article which wasn't writen by current user
            if(data.createdBy.id != Management.data.id && !Management.isGranted(2)){
                return this.banForPrivilege();
            }
            let readOnly = data.createdBy.id != Management.data.id && !Management.isGranted(2);
            if(readOnly) this.page.current.innerHTML = data.content;
            this.setState(state => {
                return {
                    ...state,
                    loading: false,
                    title: data.title,
                    content: data.content,
                    category: data.category,
                    publishauto: data.publishauto,
                    date: data.date,
                    time: data.time,
                    draft: true,
                    edit: data,
                    readOnly
                }
            });
            return;
        }
        Management.getArticle(id).then((data)=>{
            if(!data){
                return Route.back();
            }
            console.log('[Data]',data);
            //ban for article which wasn't writen by current user
            const schedule = new AkaDatetime(data.postOn);
            let readOnly = data.createdBy.id != Management.data.id && !Management.isGranted(2);// if(readOnly) this.page.current.innerHTML = data.content;
            this.setState(state => {
                return {
                    ...state,
                    title: data.title,
                    content: data.content,
                    category: data.category.id,
                    loading: false,
                    date: schedule.getDate(),
                    time: schedule.getTime(),
                    edit: data,
                    readOnly
                }
            });
        }).catch(this.setReloadable.bind(this));
    }

    componentDidMount() {
        super.componentDidMount();
        if(!Management.isGranted(1)){
            return this.banForPrivilege();
        }
        this.reload();
    }

    extractImg(){
        this.state.img = [];
        const extract = this.state.content.match(/<img src="(.+?)">/g);
        if(extract) {
            let image;
            for (let i = 0; i < extract.length; i++) {
                image = extract[i].replace(/^<img src="(.+?)">/, '$1');
                if (i === 0) {
                    this.state.caption = image;
                }
                this.state.img.push(image);
            }
        }
    }

    submit(){
        if(!this.state.title.length || !this.state.content.length || !this.state.category.toString().length){
            this.toggleDialog({
                open: true,
                content: "Vous devez soumettre un article avec au moins un titre, un contenu dans une catégorie spécifique"
            });
            return;
        }
        this.state.caption = null;
        this.extractImg();
        this.showLoading();
        const schedule = this.state.publishauto || !this.state.date.length || !this.state.time.length ? null : this.state.date+' '+this.state.time;
        const data = {
            title: this.state.title,
            content: this.state.content,
            caption: this.state.caption,
            category: this.state.category,
            schdate: schedule,
            img: this.state.img,
            ...Management.defaultQuery()
        };
        if(this.state.edit && 'id' in this.state.edit){
            data.id = this.state.edit.id;
        }
        Management
        .commitRedaction(data)
        .then((data)=>{
            if(this.state.edit && this.state.edit.draft){
                Management.removeDraft(this.state.edit.index);
            }
            this.toggleDialog({open: false});
            this.toggleSnack({
                content: Management.readCode(data.code)
            });
            if(!this.state.edit || !('id' in this.state.edit)) {
                setTimeout(() => {
                    Route.back();
                }, 300);
            }
        })
        .catch((message)=>{
            this.toggleDialog({
                content: Management.readCode(data.code),
                manual: true
            });
        })
    }

    async save(){
        if(!this.state.title.length || !this.state.content.length){
            this.toggleDialog({
                open: true,
                content: "Veuillez renseigner au moins le titre et le contenu de l'article pour l'enregistrer pour plus tard"
            });
            return;
        }
        this.extractImg();
        if(this.state.img.length) {
            this.toggleDialog({
                open: true,
                content: "Les images uploadés de votre article sont disponibles seulement pour 5 jours !"
            });
        }
        let draft = this.state.edit ? this.state.edit : {};
        draft = {
            ...draft,
            title: this.state.title,
            content: this.state.content,
            category: this.state.category,
            lastModified: AkaDatetime.now(),
            publishauto: this.state.publishauto,
            date: this.state.date,
            time: this.state.time,
            draft: true
        };
        if(this.state.edit && this.state.edit.draft){
            draft.index = this.state.edit.index;
        }
       await Management.addDraft(draft);
        Route.back();
    }

    toggleConfigurationBox(open = true){
        this.setState(state => {return {...state, openConfig: open}});
    }

    updateData(index, value){
        this.setState(state => {
            return {
                ...state,
                [index] : value
            }
        });
    }

    render() {
        if(this.block = this.blockRender()) return this.block;
        if(this.state.readOnly){
            return <div className="ui-element ui-fluid ui-scroll-y">
                <h1>
                    {this.state.title}
                </h1>
                <div className="ui-element ui-size-fluid article-reader">
                    {parser(this.state.content)}
                </div>
            </div>
        }
        return (
            <div className="ui-container editor ui-size-fluid ui-fluid-height">
                <div className="ui-container ui-size-fluid head ui-vertical-center">
                    <div className={"ui-container ui-size-7 title " + (this.state.title.length ? '' : 'empty')}
                        onClick={()=>this.toggleConfigurationBox()}
                    >
                        {this.state.title.length ? this.state.title : "Le titre de l'article"}
                    </div>
                    <div className="ui-container ui-size-5 ui-horizontal-right actions">
                        <IconButton
                            sx={{
                                color: 'black'
                            }}
                            onClick={()=>this.toggleConfigurationBox()}
                        >
                            <Icon icon="cog"/>
                        </IconButton>
                        <IconButton
                            sx={{
                                color: '#348'
                            }}
                            onClick={()=>this.submit()}
                        >
                            <Icon icon="save"/>
                        </IconButton>
                        <IconButton
                            sx={{
                                color: 'black'
                            }}
                            onClick={()=>this.save()}
                        >
                            <Icon icon="business-time"/>
                        </IconButton>
                    </div>
                </div>
                <div className="ui-container ui-size-fluid ui-fluid-height ui-scroll-y">
                    <CKEditor
                        editor={ ClassicEditor }
                        data={this.state.content}
                        onReady={ editor => {
                            editor.plugins.get('FileRepository').createUploadAdapter = (loader)=>{
                                return new UploadAdapter(loader,'artimg');
                            }
                            // console.log( 'Redactor is ready to use!', editor );
                        } }
                        onChange={ ( event, editor ) => {
                            // const data = editor.getData();
                            this.state.content = editor.getData();
                            // console.log( { event, editor, data } );
                        } }
                        onBlur={ ( event, editor ) => {
                            // console.log( 'Blur.', editor );
                        } }
                        onFocus={ ( event, editor ) => {
                            // console.log( 'Focus.', editor );
                        } }
                    />
                </div>
                <Main.DialogBox
                    title="Informations de l'article"
                    open={this.state.openConfig}
                    content = {
                        <Box className="ui-container ui-vwidth-10 ui-md-vwidth-6">
                            <TextField
                                className="ui-element ui-size-fluid"
                                label="Le titre de l'article"
                                variant="outlined"
                                value={this.state.title}
                                onChange={(e)=>{
                                    this.updateData('title', e.target.value);
                                }}
                            />
                            <Box sx={{padding: '1em 0', width: '100%'}}>
                                <Writing.RenderSelect
                                    label="Catégorie"
                                    list={this.state.categories}
                                    value={this.state.category}
                                    onChange={(e)=>{
                                        this.updateData('category', e.target.value);
                                    }}
                                />
                            </Box>
                            {
                                //We cant schedule published articles !!!
                                this.state.edit && this.state.edit.published ? null:
                                <Scheduler
                                    auto={this.state.publishauto}
                                    date={this.state.date}
                                    time={this.state.time}
                                    onChange={(data)=>{
                                        this.setState(state=>{
                                            return {
                                                ...state,
                                                publishauto: data.auto,
                                                date: data.date,
                                                time: data.time
                                            }
                                        });
                                    }}
                                />
                            }
                        </Box>
                    }
                    buttons={
                        <Button onClick={()=>this.toggleConfigurationBox(false)}>Ok</Button>
                    }
                />
                {super.renderDialog()}
            </div>
        )
    }
}