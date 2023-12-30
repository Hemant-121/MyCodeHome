import React, { useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../imgs/logo.png";
import AnimationWraper from "../common/page-animation";
import defaulBanner from "../imgs/blog banner.png";
import { uploadImage } from "../common/aws";
import { Toaster, toast } from "react-hot-toast";
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs";
import {tools} from './tools.component';

const BlogEditor = () => {

  let { blog,  blog: {title, banner, content, tags, desc}, setBlog, textEditor, setTextEditor, setEditorState } = useContext(EditorContext);

  const editorRef = useRef(null);

// useEffect
useEffect(() => {
  if (editorRef.current) {
    setTextEditor (new EditorJS({
      holder: editorRef.current,
      // holderId: "textEditor",
      data: '', // Initial data (if any)
      tools: tools, // Your custom tools
      placeholder: "Let's write an awesome story",
    }));
  }
}, [])


  const handleBannerUpload = (e) => {
    let img = e.target.files[0];

    if (img) {

        let loadingToast = toast.loading("Uploading...");

      uploadImage(img).then((url) => {
        if (url) {

            toast.dismiss(loadingToast);
            toast.success("Image Uploaded successfully ✅")

            setBlog({...blog, banner: url})
        }
      })
      .catch(err => {
        toast.dismiss(loadingToast);
        return toast.error(err)
      })
    }
  };

  const handleTitleKeyDown = (e) => {
        if (e.keyCode == 13) {    // Enter ka key code hota hai 13
            e.preventDefault();
        }
  }

  const handleTitleChange = (e) =>{
    let input = e.target;

    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';


    setBlog({
      ...blog,
      title: input.value
    })

  }

  const handleError = (e) => {
    let img = e.target;
    img.src = defaulBanner;
  }

  const handlePublishEvent = () => {
    if (!banner.length) {
      return toast.error("Upload a blog banner to publish it")
    }
    
    if (!title.length) {
      return toast.error("Write blog title to publish it")
    }

    if (textEditor.isReady) {
      textEditor.save().then(data => {
        if (data.blocks.length) {
          setBlog({...blog, content: data});
          setEditorState("publish")
        }else{
          return toast.error("Write something in your blog to publish it")
        }
      })
      .catch((error) => {
        console.log(error)
      }) 
    }
  }


  return (
    <>
      <nav className="navbar">
        <Link className="flex-none w-10">
          <img src={logo} alt="" />
        </Link>
        <p className="max-md:hidden text-black line-clamp-1 w-full">
          
          {title.length ? title : "New Blog"}

        </p>

        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" 
          onClick={handlePublishEvent}
          >Publish</button>
          <button className="btn-light py-2">Save Draft</button>
        </div>
      </nav>
        <Toaster/>
      <AnimationWraper>
        <section>
          <div className="mx-auto max-w-[900px] w-full">
            <div className="realtive aspect-video hover:opacity-80 bg-white border-4 border-grey">
              <label htmlFor="uploadBanner">
                <img 
                        src={banner} 
                        className="z-20"
                        onError={handleError}
                        />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>

            <textarea
                placeholder="Blog Title"
                className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
                onKeyDown={handleTitleKeyDown}
                onChange={handleTitleChange}
            >
            </textarea>

            <hr className="w-full opacity-10 my-5"/>

            <div ref={editorRef} id="textEditor" className="font-gelasio">
                
            </div>

          </div>
        </section>
      </AnimationWraper>
    </>
  );
};

export default BlogEditor;
