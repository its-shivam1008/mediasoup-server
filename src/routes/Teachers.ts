import express, { Request, Response, Router } from "express";
import { prismaClient } from "../lib/db";

const router = express.Router();

router.post('/create-class', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const createClass =  await prismaClient.class.create({data:{
            name:data.name,
            description:data.description,
            passcode:data.passcode,
            createdBy:user.id
        }})

        if(!createClass){
            res.status(405).json({success:false, message:"Unable to create class room"});
            return;
        }

        res.status(200).json({success:true, message:"Class room created."});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.put('/update-class/:classId', async(req:Request, res:Response)=>{
    try{
        const classId = req.params.classId;
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const existingClass = await prismaClient.class.findUnique({
            where: { id: classId }
        });

        if (!existingClass) {
            res.status(404).json({ success: false, message: "Class not found" });
            return;
        }

        let updatedClass;

        if(data.name || data.description || data.passcode){
            updatedClass = await prismaClient.class.update({where:{id:classId}, data:{...data}});
            if(!updatedClass){
                res.status(400).json({success:false, message:"Unable to update the class"});
                return;
            }
        }

        res.status(200).json({success:true, message:"Class room updated", updatedClass});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/class/:classId', async(req:Request, res:Response)=>{
    try{
        const classId = req.params.classId;
        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const existingClass = await prismaClient.class.findUnique({
            where: { id: classId }
        });

        if (!existingClass) {
            res.status(404).json({ success: false, message: "Class not found" });
            return;
        }

        res.status(200).json({success:true, message:"Class room fetched", existingClass});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
})

router.get('/classes', async(req:Request, res:Response)=>{
    try{
        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const classes = await prismaClient.class.findMany({where:{createdById:user.id}});
        if(!classes){
            res.status(400).json({success:false, message:"Unable to fetch the class rooms"});
            return;
        }

        res.status(200).json({success:true, message:"Class rooms are fetched.", classRooms:classes});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.delete('delete-class/:classId', async(req:Request, res:Response)=>{
    try{
        const classId = req.params.classId;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const existingClass = await prismaClient.class.findUnique({
            where: { id: classId }
        });

        if (!existingClass) {
            res.status(404).json({ success: false, message: "Class not found" });
            return;
        }

        await prismaClient.classJoinRequest.deleteMany({where:{classId:classId}});
        await prismaClient.classEnrollment.deleteMany({where:{classId:classId}});

        const deletedClass = await prismaClient.class.delete({ where: { id: classId } });
        if(!deletedClass){
            res.status(200).json({success:false, message:"Cannot delete the class room"});
        }

        res.status(200).json({success:true, message:"Class room deleted"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
})

router.put('/enroll-student', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }
        
        const removeStuFromClassJoinRequest = await prismaClient.classJoinRequest.deleteMany({where:{classId:data.classId, studentId:data.studentId}}); // I am using delete many here because I know there is only one row which exist where the classId and the studntId are the passed ones and also I didn't set the primary composite key so I can't use the delete function therefore I am using deleteMany.
        const addStuToClassEnrollment = await prismaClient.classEnrollment.create({data:{
            student:{connect: data.studentID},
            class:{connect: data.classId}
        }});

        if(!removeStuFromClassJoinRequest || !addStuToClassEnrollment){
            res.status(400).json({success:false, message:"Unable to enroll the student"});
            return;
        }

        res.status(200).json({success:true, message:"Student enrolled"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.delete('/enroll-student', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const removeStuFromEnrollClass = await prismaClient.classEnrollment.deleteMany({where:{classId:data.classId, studentId:data.studentId}});

        if(!removeStuFromEnrollClass){
            res.status(400).json({message:"Unable to remove the student from the class room"});
            return;
        }

        res.status(200).json({success:true, message:"Student removed from the class"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.delete('/join-request', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'TEACHER'){
            res.status(405).json({success:false, message:"Not allowed, the user is not teacher"});
            return;
        }

        const removeStuFromClassJoinRequest = await prismaClient.classJoinRequest.deleteMany({where:{classId:data.classId, studentId:data.studentId}});

        if(!removeStuFromClassJoinRequest){
            res.status(400).json({message:"Unable to remove join request"});
            return;
        }

        res.status(200).json({success:true, message:"Removed the join request from the class"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});


export default router;