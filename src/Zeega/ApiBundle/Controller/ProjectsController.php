<?php
namespace Zeega\ApiBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Serializer;
use Symfony\Component\Serializer\Encoder\JsonEncoder;

use Zeega\DataBundle\Entity\Item;
use Zeega\CoreBundle\Helpers\ItemCustomNormalizer;
use Zeega\CoreBundle\Helpers\ResponseHelper;
use Zeega\DataBundle\Entity\Layer;
use Zeega\DataBundle\Entity\Frame;

class ProjectsController extends Controller
{
    //  get_collections GET    /api/collections.{_format}
    public function getProjectAction($id)
    {	
		// very inefficient method
		// needs to be indexed (i.e. SOLR indexed) for published projects; OK for the editor (only called once when the editor is loaded)
		
		$user = $this->get('security.context')->getToken()->getUser();

		$project = $this->getDoctrine()->getRepository('ZeegaDataBundle:Project')->findOneById($id);
		$sequences = $this->getDoctrine()->getRepository('ZeegaDataBundle:Sequence')->findBy(array("project_id" => $id));
		$frames = $this->getDoctrine()->getRepository('ZeegaDataBundle:Frame')->findBy(array("project_id" => $id));
		$layers = $this->getDoctrine()->getRepository('ZeegaDataBundle:Layer')->findBy(array("project_id" => $id));
		
		$sequenceFrames = array();
		
		foreach($sequences as $sequence)
		{
			$sequenceId = $sequence->getId();
			$sequenceFrames[$sequenceId] = $this->getDoctrine()->getRepository('ZeegaDataBundle:Frame')->findIdBySequenceId($sequenceId);
		}
		
		$projectView = $this->renderView('ZeegaApiBundle:Projects:show.json.twig', array('project' => $project, 
			'sequences' => $sequences, 'sequence_frames' => $sequenceFrames, 'layers' => $layers, 'frames' => $frames));
		
    	return ResponseHelper::compressTwigAndGetJsonResponse($projectView);
    } 
    
    // put_collections_items   PUT    /api/collections/{project_id}/items.{_format}
    public function putProjectsAction($projectId)
    {
        $em = $this->getDoctrine()->getEntityManager();

        $request = $this->getRequest();
        $request_data = $this->getRequest()->request;        
        
		$project = $em->getRepository('ZeegaDataBundle:Project')->find($projectId);

        if (!$project) 
        {
            throw $this->createNotFoundException('Unable to find the Project with the id ' + $projectId);
        }

		$title = $request_data->get('title');
        $tags = $request_data->get('tags');
        $coverImage = $request_data->get('cover_image');
        $authors = $request_data->get('authors');
		$published = $request_data->get('published');
        
		if(isset($title)) $project->setTitle($title);
		if(isset($authors)) $project->setAuthors($authors);
		if(isset($coverImage)) $project->setCoverImage($coverImage);
		if(isset($tags)) $project->setTags($tags);
		if(isset($published)) $project->setPublished($published);

        $em = $this->getDoctrine()->getEntityManager();
        $em->persist($project);
        $em->flush();
        
        $projectView = $this->renderView('ZeegaApiBundle:Projects:show.json.twig', array('project' => $project));
        return ResponseHelper::compressTwigAndGetJsonResponse($projectView);       
    }
    
    public function postProjectLayersAction($projectId)
    {
    	$em = $this->getDoctrine()->getEntityManager();
     	$project= $em->getRepository('ZeegaDataBundle:Project')->find($projectId);
    	
    	$layer= new Layer();
    	$layer->setProject($project);
		$request = $this->getRequest();
    	
    	if($request->request->get('item_id'))
    	{
    	    $item = $this->getDoctrine()->getRepository('ZeegaItemBundle:Item')->find($request->request->get('item_id'));
			$layer->setItem($item);
		}
		
		if($request->request->get("type")) $layer->setType($request->request->get("type"));   	
    	if($request->request->get('text')) $layer->setText($request->request->get('text'));
		if($request->request->get('attr')) $layer->setAttr($request->request->get('attr'));
    	
		$em->persist($layer);
		$em->flush();
        
    	return ResponseHelper::encodeAndGetJsonResponse($layer);
    } // `post_sequence_layers`   [POST] /sequences

    public function postProjectSequencesFramesAction($projectId,$sequenceId)
    {
    	$em = $this->getDoctrine()->getEntityManager();
     	$project = $em->getRepository('ZeegaDataBundle:Project')->find($projectId);
     	$sequence = $em->getRepository('ZeegaDataBundle:Sequence')->find($sequenceId);
     	
     	$frame = new Frame();
    	$frame->setProject($project);
    	$frame->setSequence($sequence);
     	
     	$request = $this->getRequest();
     	
     	if($request->request->get('duplicate_id'))
        {
            $original_frame = $this->getDoctrine()->getRepository('ZeegaDataBundle:Frame')->find($request->request->get('duplicate_id'));

            if($original_frame->getThumbnailUrl()) $frame->setThumbnailUrl($original_frame->getThumbnailUrl());
            if($original_frame->getAttr()) $frame->setAttr($original_frame->getAttr());
        
            $original_layers = $original_frame->getLayers();
            
            if($original_layers)
            {
                foreach($original_layers as $original_layer)
                {
                    $frame->addLayer($original_layer);
                }
                $em->persist($frame);
                $em->flush();
            }
        }
        else
        {
            $currFrames = $em->getRepository('ZeegaDataBundle:Frame')->findBy(array("sequence_id"=>$sequenceId));

        	$frame = new Frame();
        	$frame->setProject($project);
        	$frame->setSequence($sequence);
        	$frame->setSequenceIndex(count($currFrames));
            $frame->setEnabled(true);



    		$request = $this->getRequest();

       		if($request->request->get('thumbnail_url')) $frame->setThumbnailUrl($request->request->get('thumbnail_url'));
       		if($request->request->get('attr')) $frame->setAttr($request->request->get('attr'));

       		$em->persist($frame);
       		$em->flush();

        }
        $frameView = $this->renderView('ZeegaApiBundle:Frames:show.json.twig', array('frame' => $frame));

    	return ResponseHelper::compressTwigAndGetJsonResponse($frameView);
        
     	
    } // `post_sequence_layers`   [POST] /sequences
}
