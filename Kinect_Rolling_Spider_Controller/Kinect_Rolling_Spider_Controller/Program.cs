//=============================================================================
/*
    Project : Kinnect Controller for Rolling Spider
    Author  : Connor McCann
    Date    : 15 May 2017
    Source  : https://msdn.microsoft.com/en-us/library/6y0e13d3(v=vs.110).aspx

*/
//=============================================================================
using System;
using System.Text;
using System.Windows;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using Microsoft.Kinect;
using System.Threading;
using System.Collections.Generic;


namespace rolling_spider_controller
{
    public class KinectManager
    {
        // Kinect sensor properties
        private KinectSensor kinectSensor = null;  // Active Kinect sensor
        private BodyFrameReader bodyFrameReader = null; // Reader for body frames
        private Body[] bodies = null; // Array for the bodies
        private int bodyIndex; // index for the currently tracked body
        private bool bodyTracked = false; // flag to asses if a body is currently tracked
        private bool DEBUG = false;

        // Host server properties
        private IPAddress ipadr;
        private IPEndPoint localEndPoint;
        private Socket host_server;
        private Socket handler;
        private bool clientConnected = false; // flag to see if we can send data to node yet

        // Data transmission 
        private List<float> jointData = null;
        private StringBuilder builder = null;

        public KinectManager()
        {
            // Setup the Kinect properties
            Console.WriteLine("Constructing the kinect manager");
            this.kinectSensor = KinectSensor.GetDefault();
            this.bodyFrameReader = this.kinectSensor.BodyFrameSource.OpenReader();
            this.kinectSensor.Open();
            this.bodyFrameReader.FrameArrived += this.Reader_FrameArrived;

            // Setup the host Server Properties 
            Console.WriteLine("Creating a host server");
            this.ipadr = IPAddress.Parse("127.0.0.1");
            this.localEndPoint = new IPEndPoint(ipadr, 5000);
            this.host_server = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
            this.host_server.Bind(localEndPoint);
            this.host_server.Listen(10);

            // Setup data transmission 
            this.jointData = new List<float>();
            this.builder = new StringBuilder();

            // Wait for a connection from the guest rolling spider client
            Console.WriteLine("Waiting for a connnection");
            this.handler = host_server.Accept(); // Blocks within this method but kinect is async so will executre callback

            // Poll for ready command from javascript client
            string data = null;
            while (!this.clientConnected)
            {
                byte[] bytes = new byte[10];
                int bytesRec = this.handler.Receive(bytes);
                data += Encoding.ASCII.GetString(bytes, 0, bytesRec);
                if (data.IndexOf("<EOF>") > -1)
                {
                    if (data == "ready<EOF>")
                    {
                        this.clientConnected = true;
                        Console.WriteLine("Rolling spider client now connected");
                    }
                }
            }
        }

        // Used to reverse sockaet transmission string
        public static string Reverse(string s)
        {
            char[] charArray = s.ToCharArray();
            Array.Reverse(charArray);
            return new string(charArray);
        }

        // Handles the body frame data arriving from the sensor
        private void Reader_FrameArrived(object sender, BodyFrameArrivedEventArgs e)
        {
            bool dataReceived = false;
            using (BodyFrame bodyFrame = e.FrameReference.AcquireFrame())
            {
                if (bodyFrame != null)
                {
                    if (this.bodies == null)
                    {
                        this.bodies = new Body[bodyFrame.BodyCount];
                    }
                    bodyFrame.GetAndRefreshBodyData(this.bodies);
                    dataReceived = true;
                }
            }
            if (dataReceived)
            {
                Body body = null;
                if (this.bodyTracked)
                {
                    if (this.bodies[this.bodyIndex].IsTracked)
                    {
                        body = this.bodies[this.bodyIndex];
                    }
                    else
                    {
                        bodyTracked = false;
                    }
                }
                if (!bodyTracked)
                {
                    for (int i = 0; i < this.bodies.Length; ++i)
                    {
                        if (this.bodies[i].IsTracked)
                        {
                            this.bodyIndex = i;
                            this.bodyTracked = true;
                            break;
                        }
                    }
                }
                if (body != null && this.bodyTracked && body.IsTracked)
                {
                    // body represents your single tracked skeleton
                    if (this.clientConnected)
                    {
                        if (this.DEBUG)
                        {
                            // Print all the types of joints of the body
                            IReadOnlyDictionary<JointType, Joint> joints = body.Joints;
                            foreach (JointType jointType in joints.Keys)
                            {
                                Console.WriteLine(jointType);
                            }
                        }
                        // Left wrist position
                        Joint leftWrist = body.Joints[JointType.WristLeft];
                        float leftWristX = leftWrist.Position.X;
                        float leftWristY = leftWrist.Position.Y;
                        float leftWristZ = leftWrist.Position.Z;
                        this.jointData.Add(leftWristY);
                        this.jointData.Add(leftWristZ);

                        // Right wrist position
                        Joint rightWrist = body.Joints[JointType.WristRight];
                        float rightWristX = rightWrist.Position.X;
                        float rightWristY = rightWrist.Position.Y;
                        float rightWristZ = rightWrist.Position.Z;
                        this.jointData.Add(rightWristY);
                        this.jointData.Add(rightWristZ);

                        // Hip center postion 
                        Joint spineMid = body.Joints[JointType.SpineMid];
                        float spineMidZ = spineMid.Position.Z;
                        this.jointData.Add(spineMidZ);

                        // Reverse list data so .pop() works in javascript method
                        this.jointData.Reverse();

                        // Packaged data string <WLY,WLZ,WRY,WRZ,SMZ>
                        foreach (float position in this.jointData)
                        {
                            this.builder.Append(position.ToString());
                            this.builder.Append(',');
                        }

                        // Prepare data for node.js guest client
                        try
                        {
                            // Remove the last comma
                            string toSend = this.builder.ToString();
                            toSend = toSend.Substring(0, toSend.Length - 1);
                            Console.WriteLine(toSend);

                            // Build byte array for socket transmission 
                            byte[] msg = Encoding.ASCII.GetBytes(toSend);
                            handler.Send(msg);
                            Console.WriteLine("Message sent");

                            // Clean up
                            this.builder.Clear();
                            this.jointData.Clear();

                            Thread.Sleep(100); // 4Hz Sample
                        }
                        catch (Exception)
                        {
                            // Alert the user
                            Console.WriteLine("An ERROR has Ocurred");

                            // Shutdown the socket 
                            this.handler.Shutdown(SocketShutdown.Both);
                            this.handler.Close();

                            // Exit the program
                            Environment.Exit(0);
                        }
                    }

                }
            }
        }
    }

    public class program
    {
        public static void Main(string[] args)
        {
            KinectManager kinectManager = new KinectManager();
            while (true)
            {
                // Lets the program run while handling the Kinect callback event function
            }

        }
    }
}