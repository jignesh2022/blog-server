const User = require('./models/User');
const Blog = require('./models/Blog');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const morgan = require('morgan');
var cors = require('cors');
const fileUpload = require('express-fileupload');
const _ = require('lodash'); 

//https://www.digitalocean.com/community/tutorials/nodejs-jwt-expressjs
//https://www.techomoro.com/how-to-set-up-authentication-and-authorization-in-express-using-jwt/
//error handling
//https://www.youtube.com/watch?v=UVAMha41dwo
//https://tech-blog.maddyzone.com/node.js/add-update-delete-object-array-schema-mongoosemongodb
//https://www.geeksforgeeks.org/mongodb-text-indexes/
//https://docs.mongodb.com/manual/core/index-text/
//https://www.bluleadz.com/blog/what-are-blog-tags-and-how-to-use-them
//https://attacomsian.com/blog/uploading-files-nodejs-express

dotenv.config();

const server = express();

server.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 2 * 1024 * 1024 * 1024 //2MB max file(s) size
    },
}));
server.use(cors());
server.use(morgan('dev'));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.DBCONNECTION,{useNewUrlParser:true, useUnifiedTopology:true})
    .then((result) => server.listen(PORT, () => {
            console.log(`Blog server running on port ${PORT}`);
                }
            )
        )
    .catch((error) => {
        handleError(error);
	 console.log("DB connection failed");
    })

server.get('/',(req,res)=>
                {                    
                    return res.send('Hello from Blog Server.')
                }
    )

server.post('/api/v1/create-blog',authenticateToken,async (req,res)=>{
    const params = req.body;
   	console.log(params);
    const blog = new Blog({
        title:params.title,
        summary:params.summary,
        body:params.body,
        createdBy:params.createdBy
    });
    //console.log(blog);
    
    blog.save()
        .then(async (result) =>             
            await User.updateOne(
                {_id:req.user.id},
                {"$push":{"blogs":result._id}})                
                )
        .catch((error) => {
            
            handleError(error);
		    return res.status(500).json({message:"Server Error"});
            //res.json({message:error.message});
        });
    
    return res.json({message:"Blog created successfully"});            
    
})

server.put('/api/v1/update-blog',authenticateToken,async (req,res)=>{
    const params = req.body;
    let user = null;
    try
    {
        user = await User.find(
            {
                _id:req.user.id,
                blogs:{$elemMatch:{$eq:mongoose.Types.ObjectId(params.blogid)}}
            });
    }
    catch(err)	
    {
        handleError(err);
		return res.status(500).json({message:"Server Error"});
    }
    if(user == null)
    {
        return res.json({message:'You are not owner of this blog.'});
    }
	//console.log(params);
    let result = null;
    try
    {
        result = await Blog.updateOne(
            {_id: params.blogid},
            {title:params.title,
            summary:params.summary,
            body:params.body,
            createdBy:params.createdBy
        });

        return res.json({message:`${result.n} records matched, and ${result.nModified} records modified.`})
    }
    catch(err)	
    {
        handleError(err);
		return res.status(500).json({message:"Server Error"});
    }
    
        
})

server.post('/api/v1/delete-blog/:blogid',authenticateToken,async (req,res,next)=>{
    const {blogid} = req.body;
    const {id} = req.user;
	//console.log(blogid);
    let user = null;
    try
    {
        user = await User.find(
            {
                _id:id,
                blogs:{$elemMatch:{$eq:mongoose.Types.ObjectId(blogid)}}
            });
    }
    catch(err)
    {
        handleError(err);
		return res.status(500).json({message:"Server Error"});
    }
    //console.log(user);      
    if(user == null)
    {
        return res.json({message:'You are not owner of this blog.'});
    }

    try
    {
        await Blog.deleteOne({_id:blogid});
        await User.updateOne(
                {_id:id},
                {$pull:{blogs:mongoose.Types.ObjectId(blogid)}},
                (err,result) => {
                    if(err)
                    {
                        next(err);
                    }
                    if(result != null)
                    {
                        return res.json({message:'Blog deleted'});
                    }
                }
            );
        
    }
    catch(error)
    {
        handleError(error);
		return res.status(500).json({message:"Server Error"});
    }
})


server.post('/api/v1/login', async (req,res)=>{
    const params = req.body;     
    let _user=null;
    //console.log(req.body);
	
    
	try
	{
		_user = await User.findOne({email:params.email});
		if(_user == null)
		{
			return res.json({message:"User not found"});
		}
	}
	catch(error)
	{
		handleError(error);
		return res.status(500).json({message:"Server Error"});
	}
	 
    if(_user != null)
    {    
        bcrypt.compare(params.password, _user.passwordHash, (error,result) =>{
            if(error)
            {
                handleError(error);
		        return res.status(500).json({message:"Server Error"});
            }
            else
            {
                if(result == true)
                {                    
                    const accessToken = jwt.sign({                         
                        id:_user._id,
                        name: `${_user.firstName} ${_user.lastName}`
                        }, 
                        process.env.TOKEN_SECRET, 
                        {expiresIn:'5m'});
            
                    return res.json({
                        accessToken:accessToken,
                        message:"found"
                    });
                
                }
                else  
                {
                    return res.json({message:'Password not matched'});
                }
            }
        })
    }
})

server.put('/api/v1/update-user', authenticateToken, async (req,res)=>{
    const params = req.body;         
    //console.log(req.body);
    let result = null;
    try
    {
        result = await User.updateOne({_id:req.user.id},{lastName:params.lastName});
        res.send(`${result.n} records matched, and ${result.nModified} records modified.`)
    }
    catch(err)
    {
        handleError(err); 
		return res.status(500).json({message:"Server Error"});
    }
})
 
server.delete('/api/v1/delete-user', authenticateToken, async (req,res)=>{
    try
    {
        await User.deleteOne({email:req.user.email});    
        res.json({message:'Record deleted'});
    }
    catch(error)
    {
        handleError(error);
		return res.status(500).json({message:"Server Error"});
    }
})


server.post('/api/v1/checkifuserexists',(req,res)=>{
    const params = req.body;

    //check if exists
    User.findOne({email:params.email},(error,user)=>{
        if(error)
        {
            handleError(error);
		    return res.status(500).json({message:"Server Error"});
        } 
        else
        {
            if(user != null)
            {
                return res.json({message:"This user already exists."});
            }
            else{
                return res.json({message:"This user does not exists."});
            }
        }  
    });
}); 

server.post('/api/v1/register',async (req,res)=>{
    const params = req.body;

    //check if exists
    const _user = User.findOne({email:params.email},(error,user)=>{
        if(error)
        {
            handleError(error);
		    return res.status(500).json({message:"Server Error"});
        }
        else
        {
            if(user != null)
            {
                return res.json({message:"This user already exists."});
            }
        }  
    });
 
    let _hash;
    bcrypt.hash(params.password, 10)
        .then(hash => _hash = hash)
        .catch(err => {
            handleError(err);
		    return res.status(500).json({message:"Server Error"});
        });
    
      
    const newuser = new User({
        firstName: params.firstName,
        lastName: params.lastName,
        email:params.email,
        passwordHash:_hash
    });

    newuser.save()
        .then((result) => res.json({message:"New User created."}))
        .catch((error) => {
            handleError(error);
		    return res.status(500).json({message:"Server Error"});
        })
});

server.post('/api/v1/get-blogs',(req,res)=>{
    
    //https://www.npmjs.com/package/mongoose-paginate-v2
    
    var {searchTerm,pagenum,numOfRecords} = req.body;
	//console.log(req.body);
    if(pagenum == null || numOfRecords == null)
    {
        handleError(new Error("Pagenum and/or numOfRecords missing."));
		return res.status(400).json({message:"bad request"});
    }
    
    if(pagenum && pagenum > 0)
    {
        pagenum = pagenum - 1;
    }   
    
    var query = {};
    if(searchTerm != null && searchTerm.trim().length > 0)
    {
        query = {$text:{$search:searchTerm}};
    }

    var options = {    
    sort: { createdAt: -1 },
    //populate: 'author',
    //lean: true,
    offset: pagenum*numOfRecords, 
    limit: numOfRecords
    };
	//console.log(query);
    Blog.paginate(query, options, (err,result)=>{
        
        if(err)
        {
            //console.log(err);
            handleError(err);
		    return res.status(500).json({message:"Server Error"});
        }

        // result.docs
        // result.totalDocs = 100
        // result.limit = 10
        // result.page = 1
        // result.totalPages = 10
        // result.hasNextPage = true
        // result.nextPage = 2
        // result.hasPrevPage = false
        // result.prevPage = null
        // result.pagingCounter = 1

        return res.json(result);

    });
});

server.post('/api/v1/get-user-blogs', authenticateToken, 
                async (req,res)=>{    
    //https://www.npmjs.com/package/mongoose-paginate-v2
            
    var {pagenum,numOfRecords} = req.body;
    if(pagenum == null || numOfRecords == null)
    {
        handleError(new Error("Pagenum and/or numOfRecords missing."));
		return res.status(400).json({message:"bad request"});
        //throw new Error("Pagenum and/or numOfRecords missing.");
    }
    
    let user =null;
    try
    {
        user = await User.findOne({_id:req.user.id});
    }
    catch(err) 
    {
        handleError(err);
		return res.status(500).json({message:"Server Error"});
    }
    if(user == null)
    {
        return res.json({message:'User not logged in.'});
    }

    if(pagenum && pagenum > 0)
    {
        pagenum = pagenum - 1;
    }   
    
    var query = {_id:{$in:user.blogs}};
    var options = {    
    sort: { createdAt: -1 },
    
    offset: pagenum*numOfRecords, 
    limit: numOfRecords
    };

    Blog.paginate(query, options, (err,result)=>{
        
        if(err)
        {
            handleError(err);
		    return res.status(500).json({message:"Server Error"});
        }

        // result.docs
        // result.totalDocs = 100
        // result.limit = 10
        // result.page = 1
        // result.totalPages = 10
        // result.hasNextPage = true
        // result.nextPage = 2
        // result.hasPrevPage = false
        // result.prevPage = null
        // result.pagingCounter = 1

        return res.json(result);

    });
});    

server.get('/api/v1/blog/:blogid',(req,res)=>{
    Blog.findById(req.params.blogid,(err,blog)=>{
        if(err != null)
        {
            handleError(err);
		    return res.status(500).json({message:"Server Error"});
        }

        if(blog != null)
        {
            return res.json(blog);
        }
    })
});

server.post('/api/v1/blogToBeUpdated',authenticateToken,async (req,res)=>{
	let user = null;
    try
    {        
        user = await User.find(
            {
                _id:req.user.id,
                blogs:{$elemMatch:{$eq:mongoose.Types.ObjectId(req.body.blogid)}}
            });
    }
    catch(err)
    {		
		handleError(err);
		return res.status(500).json({message:err.message});
    }
    
	if(user == null)
    {
        return res.json({message:'You are not owner of this blog.'});
    } 
	
    Blog.findById({_id:req.body.blogid},(err,blog)=>{
        if(err != null)
        {
            handleError(err);
		    return res.status(500).json({message:err.message});
        }

        if(blog != null) 
        {
            return res.json(blog);
        }
    })
});

server.post('/api/v1/blog/upload-images', authenticateToken, (req, res) => {
    try 
    {        
        if(!req.files) 
        {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } 
        else 
        {
           
            let photo = req.files.photo;

            if (!fs.existsSync('./images/' + req.user.id)) 
            {
                fs.mkdirSync('./images/' + req.user.id)
            }   
            //console.log(photo);    
            //move photo to directory            
            const dest = './images/' + req.user.id + '/' + photo.name;
            photo.mv(dest);
            
            const data = {
                name: photo.name,
                mimetype: photo.mimetype,
                size: photo.size
            };           
    
            //return response
            res.send({
                status: true,
                message: 'File is uploaded',
                data: data
            });
        }
    } 
    catch (err) 
    {
        throw err;
        //res.status(500).send(err);
    } 
});

//'not found' middleware
server.use((req,res,next)=>{
    // const error = new Error("Not Found");
    // error.status = 404;
    // next(error);
    return res.status(404).json({message:"Not Found"});
})

//error handler middleware
server.use((err,req,res,next)=>{
    //log error to file
    const stream = fs.createWriteStream('error.txt', { flags: 'a' });        
    stream.write("\n" + new Date().toString() + '\n' + err.stack + '\n****************');       
    stream.end();
    
    res.send(err.message)
})

function handleError(err)
{
	const stream = fs.createWriteStream('error.txt', { flags: 'a' });        
    stream.write("\n" + new Date().toString() + '\n' + err.stack.split(/\r?\n/)[1] + '\n****************');       
    stream.end();
	
}

function authenticateToken(req, res, next) {
    //const authHeader = req.headers['Authorization']
	//console.log(authHeader);
    const token = req.body.token; //authHeader && authHeader.split(' ')[1]
    //console.log(token);
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
      /*console.log(err)*/
  
      if (err) return res.sendStatus(403)
  
      req.user = user
  
      next()
    })
  }

