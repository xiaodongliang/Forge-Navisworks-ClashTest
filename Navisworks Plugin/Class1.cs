//------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;


using Autodesk.Navisworks.Api;
using Autodesk.Navisworks.Api.Interop;
using COMBridge = Autodesk.Navisworks.Api.ComApi.ComApiBridge;
using ComAPI = Autodesk.Navisworks.Api.Interop.ComApi;

using Autodesk.Navisworks.Api.DocumentParts;
using Autodesk.Navisworks.Api.Clash;
using Newtonsoft.Json;
using RestSharp;
using Autodesk.Navisworks.Api.Plugins;

[Serializable]
public class ClashTestCls
{
    public string DisplayName { get; set; }
    public ClashResultCls[] ClashResults { get; set; }
}

[Serializable]
public class ClashResultCls
{
    public string DisplayName { get; set; }
    public string Status { get; set; }
    public string Description { get; set; }
    public string Found { get; set; }
    public string ApprovedBy { get; set; }
    public string path1ID { get; set; }
    public string path2ID { get; set; }
    public double[] CenterPt { get; set; }
    public double[] BoundingBox { get; set; }
    public double[] ViewBoundingBox { get; set; }
    public double[] SuitablePosition { get; set; }

    public ClashResultVP viewpoint { get; set; }

}

[Serializable]
public class ClashResultVP
{
    public double[] Position { get; set; }
    public double[] Target { get; set; }
    public double[] UpVec { get; set; }
    public double[] RotAxis { get; set; }
    public double RotAngle { get; set; }
}

namespace ForgeClashTest
{
    [PluginAttribute("ForgeClashTest",                   //Plugin name
                     "ADSK",                                       //4 character Developer ID or GUID
                    ToolTip = "Upload ClashTest",//The tooltip for the item in the ribbon
                     DisplayName = "Upload ClashTest")]          //Display name for the Plugin in the Ribbon
    public class Class1:AddInPlugin
    {
        public override int Execute(params string[] parameters)
        {
            ClashByNetAPI();
            return 0;
        }

        private void ClashByCOMAPI()
        {
            try
            { 
                ComAPI.InwOpState10 oState;
                oState = COMBridge.State;

                //find the clash detective plugin
                ComAPI.InwOpClashElement m_clash = null;

                foreach (ComAPI.InwBase oPlugin in oState.Plugins())
                {
                    if (oPlugin.ObjectName == "nwOpClashElement")
                    {
                        m_clash = (ComAPI.InwOpClashElement)oPlugin;
                        break;
                    }
                }

                if (m_clash == null)
                {
                    System.Windows.Forms.MessageBox.Show(
                        "cannot find clash test plugin!");
                }


                System.Globalization.CultureInfo cultureInfo = System.Globalization.CultureInfo.CreateSpecificCulture("en-US");
                string format = "ddd MMM d HH:mm:ss zz00 yyyy";

                List<ClashTestCls> tests_array = new List<ClashTestCls>();

             
                    foreach (ComAPI.InwOclClashTest test in m_clash.Tests())
                    {
                        ClashTestCls oEachTest = new ClashTestCls();
                        oEachTest.DisplayName = test.name;

                        List<ClashResultCls> test_results_array = new List<ClashResultCls>();
                        foreach (ComAPI.InwOclTestResult issue in test.results())
                        {
                            ClashResultCls oEachResult = new ClashResultCls();
                            oEachResult.DisplayName = issue.name;
                            oEachResult.ApprovedBy = issue.ApprovedBy;
                            oEachResult.Status = issue.status.ToString();
                        
                            //oEachResult.Found = issue.CreatedTime.ToUniversalTime().ToString();

                            ModelItem oMI1 = COMBridge.ToModelItem(issue.Path1);
                            string path1_id = oMI1.PropertyCategories.FindPropertyByDisplayName("Entity Handle", "Value").Value.ToDisplayString();
                            oEachResult.path1ID = path1_id;
                            ModelItem oMI2 = COMBridge.ToModelItem(issue.Path2);
                            string path2_id = oMI2.PropertyCategories.FindPropertyByDisplayName("Entity Handle", "Value").Value.ToDisplayString();
                            oEachResult.path2ID = path2_id;

                            oEachResult.viewpoint = new ClashResultVP();

                            ComAPI.InwNvViewPoint vp = issue.GetSuitableViewPoint();
                            oEachResult.viewpoint.Position = new double[3]{
                                    vp.Camera.Position.data1,
                                    vp.Camera.Position.data2,
                                    vp.Camera.Position.data3
                                  };

                            ComAPI.InwLVec3f oDirVec = vp.Camera.GetViewDir();
                            oEachResult.viewpoint.Target = new double[3]{
                            vp.Camera.Position.data1 + vp.FocalDistance * oDirVec.data1,
                            vp.Camera.Position.data2 + vp.FocalDistance * oDirVec.data2,
                            vp.Camera.Position.data3 + vp.FocalDistance * oDirVec.data3 };

                            ComAPI.InwLVec3f upVec = vp.Camera.GetUpVector();
                            oEachResult.viewpoint.UpVec = new double[3] { upVec.data1, upVec.data2, upVec.data3 };

                            ComAPI.InwLRotation3f rot = vp.Camera.Rotation;
                            oEachResult.viewpoint.RotAxis = new double[3] { rot.GetAxis().data1, rot.GetAxis().data2, rot.GetAxis().data3 };
                            oEachResult.viewpoint.RotAngle = rot.angle;

                            test_results_array.Add(oEachResult);
                        }

                        oEachTest.ClashResults = test_results_array.ToArray();
                        tests_array.Add(oEachTest);

                    } //Test
 
                string jsonStr = JsonConvert.SerializeObject(tests_array.ToArray()); 

                 const String strClient = "http://localhost:3001";
                RestClient _thisclient = new RestClient(strClient);

                RestRequest authReq = new RestRequest();
                authReq.Resource = "ClashTestRoute/postNewClash";
                authReq.Method = Method.POST;

                byte[] fileData = System.Text.Encoding.Default.GetBytes(jsonStr);
                authReq.AddParameter("Content-Length", fileData.Length);
                authReq.AddHeader("Content-Type", "application/octet-stream");
                authReq.AddFile("file", fileData, "clashtestresult.json", "application/octet-stream");
                IRestResponse result = _thisclient.Execute(authReq);
                if (result.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    System.Windows.Forms.MessageBox.Show("The updated clash json has been sent to server successfully!");
                }
                else
                {
                    System.Windows.Forms.MessageBox.Show("failed to upload clash json to server! " + result.StatusCode.ToString());
                }
            }
            catch(Exception ex)
            {
                System.Windows.Forms.MessageBox.Show(ex.ToString());
            }
        }

        void ClashByNetAPI()
        {

            try
            {
                Document document =
                     Autodesk.Navisworks.Api.Application.ActiveDocument;
                DocumentClash documentClash = document.GetClash();
                DocumentClashTests oDCT = documentClash.TestsData;

                List<ClashTestCls> tests_array = new List<ClashTestCls>();

                foreach (ClashTest test in oDCT.Tests)
                {
                    ClashTestCls oEachTest = new ClashTestCls();
                    oEachTest.DisplayName = test.DisplayName;

                    List<ClashResultCls> test_results_array = new List<ClashResultCls>();

                    foreach (SavedItem saveditem in test.Children)
                    {
                        ClashResultGroup group =
                            saveditem as ClashResultGroup;
                        if (null != group)
                        {
                            //foreach (SavedItem issue1 in group.Children)
                            //{
                            //    ClashResult rt1 = issue as ClashResult;
                            // }

                            //skip folder. just for simple demo
                        }
                        else
                        {
                            ClashResult nwissue = (ClashResult)saveditem;

                            ClashResultCls oEachResult = new ClashResultCls();
                            oEachResult.DisplayName = nwissue.DisplayName;
                            oEachResult.ApprovedBy = nwissue.ApprovedBy;
                            oEachResult.Status = Enum.GetName(typeof(ClashResultStatus), nwissue.Status);
                            oEachResult.Description = nwissue.Description;
                            oEachResult.Found = nwissue.CreatedTime.Value.ToString("yyyy-MM-dd HH:mm:ss");

                            //DWG or Revit files
                            DataProperty oDP = nwissue.Item1.PropertyCategories.FindPropertyByDisplayName("Entity Handle", "Value");
                            if (oDP == null)
                                oDP = nwissue.Item1.PropertyCategories.FindPropertyByDisplayName("Element ID", "Value");
                            oEachResult.path1ID = oDP.Value.ToDisplayString();

                            oDP = nwissue.Item2.PropertyCategories.FindPropertyByDisplayName("Entity Handle", "Value");
                            if (oDP == null)
                                oDP = nwissue.Item1.PropertyCategories.FindPropertyByDisplayName("Element ID", "Value");
                            oEachResult.path2ID = oDP.Value.ToDisplayString();


                            oEachResult.CenterPt = new double[3] {nwissue.Center.X,
                                                              nwissue.Center.Y,
                                                              nwissue.Center.Z };


                            oEachResult.BoundingBox = new double[6] {nwissue.BoundingBox.Min.X,
                                                                 nwissue.BoundingBox.Min.Y,
                                                                 nwissue.BoundingBox.Min.Z,
                                                                 nwissue.BoundingBox.Max.X,
                                                                 nwissue.BoundingBox.Max.Y,
                                                                 nwissue.BoundingBox.Max.Z};

                            oEachResult.ViewBoundingBox = new double[6] {nwissue.ViewBounds.Min.X,
                                                                 nwissue.ViewBounds.Min.Y,
                                                                 nwissue.ViewBounds.Min.Z,
                                                                 nwissue.ViewBounds.Max.X,
                                                                 nwissue.ViewBounds.Max.Y,
                                                                 nwissue.ViewBounds.Max.Z};

                            oEachResult.SuitablePosition = new double[3] {nwissue.ViewBounds.Max.X ,
                                                                 nwissue.ViewBounds.Min.Y,
                                                                (nwissue.ViewBounds.Min.Z + nwissue.ViewBounds.Max.Z)/2.0};



                            oEachResult.viewpoint = new ClashResultVP();

                            test_results_array.Add(oEachResult);
                        }

                    }//Result
                    oEachTest.ClashResults = test_results_array.ToArray();
                    tests_array.Add(oEachTest);
                } //Test


                string jsonStr = JsonConvert.SerializeObject(tests_array.ToArray());


                const String strClient = "http://localhost:3001";
                RestClient _thisclient = new RestClient(strClient);

                RestRequest authReq = new RestRequest();
                authReq.Resource = "ClashTestRoute/postNewClash";
                authReq.Method = Method.POST;

                byte[] fileData = System.Text.Encoding.Default.GetBytes(jsonStr);
                authReq.AddParameter("Content-Length", fileData.Length);
                authReq.AddHeader("Content-Type", "application/octet-stream");
                authReq.AddFile("file", fileData, "clashtestresult.json", "application/octet-stream");

                IRestResponse result = _thisclient.Execute(authReq);
                if (result.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    System.Windows.Forms.MessageBox.Show("The updated clash json has been sent to server successfully!");
                }
                else
                {
                    System.Windows.Forms.MessageBox.Show("failed to upload clash json to server! " + result.StatusCode.ToString());
                }
            }
            catch(Exception ex)
            {
                System.Windows.Forms.MessageBox.Show(ex.ToString());
            }
        }  
    }
}
