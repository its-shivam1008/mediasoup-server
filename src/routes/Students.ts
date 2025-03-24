import express, { Request, Response } from "express";
import { prismaClient } from "../lib/db";

const router = express.Router();


router.get('/get-class', async(req:Request, res:Response) => {
    try{
        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const classRoom = await prismaClient.class.findMany({take:10, 
            select:{
                name:true,
                description:true,
                id:true,
                createdBy:{
                    include:{
                        user:{
                            select:{
                                name:true
                            }
                        }
                    }
                }
            }
        });
        if(!classRoom){
            res.status(404).json({success:false, message:"Class room not found"});
            return;
        }

        res.status(200).json({success:true, message:"Classes fetched", classRooms:classRoom});

    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/get-class/:id', async(req:Request, res:Response) => {
    try{
        const id = req.params.id;
        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }
        const existingClass = await prismaClient.class.findUnique({
            where: { id: id }, 
            select:{
                name:true,
                description:true,
                id:true,
                createdBy:{
                    include:{
                        user:{
                            select:{
                                name:true
                            }
                        }
                    }
                }
            }
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

router.post('/join-request', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const classRoom = await prismaClient.class.findUnique({where:{id: data.classId}})
        if(!classRoom){
            res.status(404).json({success:false, message:"Class room not found"});
            return;
        }

        const isJoinRequestAlreadyExist = await prismaClient.classJoinRequest.findMany({
            where:{studentId:user.id, classId:data.clasId}
        })

        if(isJoinRequestAlreadyExist){
            res.status(400).json({success:false, message:"You have already requested to join this class"});
            return;
        }

        if(classRoom.passcode != data.passcode){
            res.status(400).json({success:false, message:"Wrong passcode provided"});
            return;
        }

        const joinRequest = await prismaClient.classJoinRequest.create({data:{
            studentId: user.id,
            classId:data.classId,
            passcode: data.passcode
        }});
        if(!joinRequest){
            res.status(400).json({success:false, message:"Unable to send the join request"});
            return;
        }

        res.status(200).json({success:true, message:"Requested to join the class."});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/join-request', async(req:Request, res:Response) => {
    try{
        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const joinRequestClasses = await prismaClient.classJoinRequest.findMany({
            where:{studentId:user.id},
            include: {
                class: {
                    select: {
                        name: true,
                        description: true,
                        id:true
                    }
                }
            }
        });

        if(!joinRequestClasses){
            res.status(400).json({success:false, message:"No join requests"});
            return;
        }

        res.status(200).json({success:true, message:"Classes you requested to join are fetched", classes:joinRequestClasses});

    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/enroll-class/:classId', async(req:Request, res:Response)=>{
    try{
        const classId = req.params.classId;

        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const enrollClass = await prismaClient.classEnrollment.findMany({
            where:{classId:classId, studentId:user.id},
            include:{
                class:{
                    select:{
                        id:true,
                        description:true,
                        name:true
                    },
                    include:{
                        createdBy:{
                            include:{
                                user:{
                                    select:{
                                        name:true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if(!enrollClass){
            res.status(404).json({success:false, message:"Enrolled class not found"})
            return;
        }

        res.status(200).json({success:true, message:"Enrolled class fetched", enrollClass});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
})

router.get('/enroll-classes', async(req:Request, res:Response) => {
    try{
        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const enrollClasses = await prismaClient.classEnrollment.findMany({
            where:{studentId:user.id},
            include:{
                class:{
                    select:{
                        name:true,
                        description:true,
                        id:true
                    }
                }
            }
        });
        if(!enrollClasses){
            res.status(400).json({success:false, message:"No enrolled classes"});
            return;
        }

        res.status(200).json({success:true, message:"Classes you requested to join are fetched", classes:enrollClasses});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

// delete the join request or enrollment from the class 
router.delete('/enroll-class/:classId', async(req:Request, res:Response)=>{
    try{
        const classId = req.params.classId;

        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const removeStuFromEnrollClass = await prismaClient.classEnrollment.deleteMany({where:{classId:classId, studentId:user.id}});

        if(!removeStuFromEnrollClass){
            res.status(400).json({message:"Unable to remove the user from the class room"});
            return;
        }

        res.status(200).json({message:"User removed from the class"});
    }catch(err){
        res.status(500).json({message:"Internal server error", success:false});
    }
});

router.delete('/join-request/:classId', async(req:Request, res:Response)=>{
    try{
        const classId = req.params.classId;

        const user = req.user;
        if(user.role != 'STUDENT'){
            res.status(405).json({success:false, message:"Not allowed, the user is not student"});
            return;
        }

        const removeStuFromClassJoinRequest = await prismaClient.classJoinRequest.deleteMany({where:{classId:classId, studentId:user.id}});

        if(!removeStuFromClassJoinRequest){
            res.status(400).json({message:"Unable to withdraw join request"});
            return;
        }
        
        res.status(200).json({message:"Join request has been withdrawn"});
    }catch(err){
        res.status(500).json({message:"Internal server error", success:false});
    }
})

export default router;