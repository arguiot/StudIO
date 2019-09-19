//
//  GameScene.swift
//  StudIO
//
//  Created by Arthur Guiot on 17/09/2019.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

/* Features to work on:
 
1. Pause
2. Restart
3. Fix bug when ball obj hit corners, it goes flat
4. Sign In and store user score
5. Leader board
 
*/

/* Features to improve on:
1. Better way to stop the game and handle nodes
2. Methods can be organized better
3. Better way to handle segue
*/


import SpriteKit
import GameplayKit
import AVFoundation

//Global variable for game current status ie to keep playing or stop game
struct gamePlay {
    static var gameHasEnded = false
    static var gameStarted = false
    static var ball : SKSpriteNode?
    static func stopGame() {
        gamePlay.gameHasEnded = true
        gamePlay.ball?.position = CGPoint(x: -1000, y: -1000)
        gamePlay.ball?.physicsBody!.pinned = true
        gamePlay.ball?.isHidden = true
    }
}

class GameScene: SKScene, SKPhysicsContactDelegate  {
    
    var entities = [GKEntity]()
    var graphs = [String : GKGraph]()
    private var lastUpdateTime : TimeInterval = 0
    private var label : SKLabelNode?
    private var spinnyNode : SKShapeNode?
    
    //labels
    var scoreLabel: SKLabelNode?
    var gameLabel: SKLabelNode?
   
    //node objs
    
    var floor : SKSpriteNode?
    var paddle : SKSpriteNode?
    
    //for scoring
    var score = 0
    var blue = 10
    var yellow = 15
    var green = 5
    var count = 0 //to speed up game every 10 impacts
    var brickCalled = 0
    
    //impact categories
    let ballCategory: UInt32 = 0x1 << 1
    let paddleCategory: UInt32 = 0x1 << 2
    let yellowBrickCategory: UInt32 = 0x1 << 3
    let greenBrickCategory: UInt32 = 0x1 << 4
    let blueBrickCategory: UInt32 = 0x1 << 5
    let bottomCategory: UInt32 = 0x1 << 6
    let borderCategory: UInt32 = 0x1 << 7
    
    //scene constructor
    override func didMove(to view: SKView) {
        
        super.didMove(to: view)
        
        setUp()//inital set up
    }
    
    func setUp() {
        physicsWorld.gravity = CGVector(dx: 0.0, dy: 0.0) //turn off gravity
        self.physicsWorld.contactDelegate = self
        
        //create border to trap the bouncy ball object
        let borderFrame = CGRect(x: -size.width / 2 * 0.88, y: -size.height / 2, width: size.width * 0.88, height: size.height)
        let border = SKPhysicsBody(edgeLoopFrom: borderFrame)
        border.friction = 0
        self.physicsBody = border
        border.restitution = 1
        border.mass = 1000000
        border.categoryBitMask = borderCategory
        border.contactTestBitMask = ballCategory
        
        //set up gameOver label
        gameLabel = childNode(withName: "gameLabel") as? SKLabelNode
        gameLabel?.fontSize = 50
        gameLabel?.position = CGPoint(x: 0, y: 100)
        gameLabel?.text = "Touch the screen to start"
        
        //set up scoreLabel
        scoreLabel = childNode(withName: "scoreLabel") as? SKLabelNode
        scoreLabel?.fontSize = 50
        scoreLabel?.position = CGPoint(x: -size.width / 2 + 200, y: size.height / 2 - 100)
        scoreLabel?.text = "Score: \(score)"
        
        gamePlay.ball?.position = CGPoint(x: 0, y: 0)
        gamePlay.ball?.physicsBody!.affectedByGravity = false
        gamePlay.ball?.physicsBody!.pinned = false
        gamePlay.ball?.isHidden = false
        //gamePlay.ball?.physicsBody!.mass = 1000000
        
        paddle?.physicsBody!.pinned = false
        
        gamePlay.gameHasEnded = false
        gamePlay.gameStarted = false
        
        score = 0
        //adjustYPosition = 150
    }
    
    func startGame() {
        
        //declare the nodes
        floor = childNode(withName: "bottom") as? SKSpriteNode
        gamePlay.ball = childNode(withName: "ball") as? SKSpriteNode
        paddle = childNode(withName: "paddle") as? SKSpriteNode
        
        let viewBottom = CGPoint(x: (scene!.view?.center.x)!, y: scene!.view!.frame.maxY)
        let sceneBottom = scene!.view!.convert(viewBottom, to: scene!)
        let nodeBottom = scene!.convert(sceneBottom, to: paddle!)
        paddle?.position = nodeBottom
        
        //apply impulse so the ball moves
        
        gamePlay.ball?.physicsBody!.applyImpulse(CGVector(dx: 50, dy: -50))
        paddle?.physicsBody!.mass = 100000 //
        
        //contact categories
        gamePlay.ball?.physicsBody!.categoryBitMask = ballCategory
        gamePlay.ball?.physicsBody!.contactTestBitMask = bottomCategory
        gamePlay.ball?.physicsBody!.contactTestBitMask = paddleCategory
        gamePlay.ball?.physicsBody!.contactTestBitMask = greenBrickCategory
        gamePlay.ball?.physicsBody!.contactTestBitMask = blueBrickCategory
        gamePlay.ball?.physicsBody!.contactTestBitMask = yellowBrickCategory
        gamePlay.ball?.physicsBody!.contactTestBitMask = borderCategory
        
        floor?.physicsBody?.categoryBitMask = bottomCategory
        floor?.physicsBody?.contactTestBitMask = ballCategory
        
        paddle?.physicsBody?.categoryBitMask = paddleCategory
        paddle?.physicsBody!.contactTestBitMask = ballCategory
        
        //call createBrick method
        createBrick(color: "yellow", adjustYPosition: 150, numRows: 3, category: yellowBrickCategory)
        createBrick(color: "blue", adjustYPosition: 250, numRows: 2, category: blueBrickCategory)
        createBrick(color: "green", adjustYPosition: 350, numRows: 2, category: greenBrickCategory)
        
        //hide gameLabel
        gameLabel?.text = ""
        gameLabel?.isHidden = true
    }
    
    //create bricks
    func createBrick(color: String, adjustYPosition: CGFloat, numRows: Int, category: UInt32) {
        
        //to calculate number of bricks per row
        let tmp_element = SKSpriteNode(imageNamed: "\(color).png")
        tmp_element.size = CGSize(width: 50, height: 20)
        let numberOfElements = Int(size.width * 0.88 / tmp_element.size.width) - 2

        for row in 0...numRows {
            for column in 0...numberOfElements {
                
                let element = SKSpriteNode(imageNamed: "\(color).png")
                element.size = CGSize(width: 50, height: 20)
                element.name = "brick"
                element.physicsBody = SKPhysicsBody(rectangleOf: element.size)
                element.physicsBody?.categoryBitMask = category
                //set contact of bricks and the ball
                element.physicsBody?.contactTestBitMask = ballCategory
                element.physicsBody?.affectedByGravity = false
                element.physicsBody?.restitution = 1
                element.physicsBody?.allowsRotation = false
                element.physicsBody?.mass = 10000000
                addChild(element)

                let elementX = -size.width / 2 + 100 + element.size.width * CGFloat(column)
                let elementY = size.height / 2 - CGFloat(adjustYPosition) - (element.size.height * CGFloat(row))
                element.position = CGPoint(x: elementX , y: elementY)
            }
        }
    }
    
    //when user touch the screen
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        
        if gamePlay.gameHasEnded == false{
            for touch in touches {
                let touchLocation = touch.location(in: self)
                paddle?.position.x = touchLocation.x
                break
            }
        } else {
            let touch = touches.first
            if let location = touch?.location(in: self) {
                let theNodes = nodes(at: location)
                
                //Iterate through all elements on the scene to see if the click event has happened on the "Play/Resume" button
                for node in theNodes {
                    if node.name == "restart" {
                        print("restartis pressed")
                        node.removeFromParent()
                        removeRestartBtn()
                        restartGame()
                        break
                    }
                }
            }
        }
    }
    
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        
        //user touch to start the game
        if gamePlay.gameStarted == false {
            gamePlay.gameStarted = true
            startGame()
        }
        
        //after game has started, set paddle position to user touch location
        if gamePlay.gameHasEnded == false{
            for touch in touches {
                let touchLocation = touch.location(in: self)
                paddle?.position.x = touchLocation.x
                break
            }
        }
    }
    
    // MARK: - SKPhysicsContactDelegate
    func didBegin(_ contact: SKPhysicsContact) {
        
        checkEndGame() // check if all bricks have been cleared
        
        if gamePlay.gameHasEnded == false {
            var firstBody: SKPhysicsBody
            var secondBody: SKPhysicsBody
            // Identify bodies of contacts
            if contact.bodyA.categoryBitMask < contact.bodyB.categoryBitMask {
                firstBody = contact.bodyA
                secondBody = contact.bodyB
            } else {
                firstBody = contact.bodyB
                secondBody = contact.bodyA
            }
            
            // Check for collisions
            if firstBody.categoryBitMask == ballCategory && secondBody.categoryBitMask == yellowBrickCategory {
                secondBody.node?.removeFromParent()
                score += yellow
                scoreLabel?.text = "Score: \(score)"
                print("Yellow contact has been made.")
                audioPlayer.playImpactSound(sound: "impact2")
            } else if firstBody.categoryBitMask == ballCategory && secondBody.categoryBitMask == blueBrickCategory {
                secondBody.node?.removeFromParent()
                score += blue
                scoreLabel?.text = "Score: \(score)"
                print("Blue contact has been made.")
                audioPlayer.playImpactSound(sound: "impact2")
            } else if firstBody.categoryBitMask == ballCategory && secondBody.categoryBitMask == greenBrickCategory {
                secondBody.node?.removeFromParent()
                score += green
                scoreLabel?.text = "Score: \(score)"
                print("Green contact has been made.")
                audioPlayer.playImpactSound(sound: "impact2")
//            } else if firstBody.categoryBitMask == ballCategory && secondBody.categoryBitMask == paddleCategory {
//                audioPlayer.playImpactSound(sound: "impact1")
                //let randomX = Float.random(in: 0 ..< 100.0)
                //let randomY = Float.random(in: 10 ..< 180)
                //let force = CGVector(dx: CGFloat(50), dy: CGFloat(1000))
                //gamePlay.ball?.physicsBody?.applyForce(force)
            } else if firstBody.categoryBitMask == ballCategory && secondBody.categoryBitMask == borderCategory {
                audioPlayer.playImpactSound(sound: "impact1")
            } else if firstBody.categoryBitMask == ballCategory && secondBody.categoryBitMask == bottomCategory {
                print("Bottom contact has been made.")
                gamePlay.gameHasEnded = true
                gameOver()
            }
            
            count += 1 //Speed up the ball every 10 impacts
            
            if count == 3 {
                speedUp() //speed up the game after every touch
            }
        }
    }
    
    //Check if all bricks have been cleared
    func checkEndGame() {
        var countBrick = 0
        for child in self.children{
            if child.name == "brick"{
                countBrick += 1
                break
            }
        }
        
        if countBrick == 0 {
            gamePlay.gameHasEnded = true
            gameIsFinished()
        }
    }
    
    //spued up the game
    func speedUp() {
        gamePlay.ball?.physicsBody!.angularDamping +=  0.001
        gamePlay.ball?.physicsBody!.restitution += 0.0005
        count = 0
    }
    
    //for the falling bricks when game ended
    func gameEndedEffect() {
        
        physicsWorld.gravity = CGVector(dx: 0, dy: -1.0)
        
        for child in self.children{
            if child.name == "brick"{
                child.physicsBody? = SKPhysicsBody(rectangleOf: CGSize(width: 50, height: 20))
                child.physicsBody?.affectedByGravity = true
                child.physicsBody?.mass = 10
            }
        }
        
        audioPlayer.playImpactSound(sound: "gameOver")
    }
    
    //set end game scene
    func setEndGame() {
        
        gamePlay.ball?.position = CGPoint(x: -size.width / 2, y: -size.height / 2)
        gamePlay.ball?.physicsBody!.pinned = true
        gamePlay.ball?.isHidden = true
        
        paddle?.physicsBody!.pinned = true
        
        scoreLabel?.position = CGPoint(x: 0, y: 200)
    }
    
    //for when user clears all the bricks
    func gameIsFinished() {
        showRestartBtn()
        setEndGame()
        displayLabel(textLabel: "Level completed!")
        showRestartBtn()
    }
    
    //game over ball touched the floor
    func gameOver() {
        setEndGame()
        gameEndedEffect()
        displayLabel(textLabel: "Game Over")
        showRestartBtn()
    }
    
    //show Restart button when game ended
    func showRestartBtn() {
        let restartBtn = SKSpriteNode(imageNamed: "restart")
        restartBtn.size = CGSize(width:75, height:75)
        restartBtn.name = "restart"
        restartBtn.position = CGPoint(x: 0, y: -10)
        addChild(restartBtn)
    }
    
    //remove restart btn
    func removeRestartBtn() {
        for child in self.children{
            if child.name == "restart"{
                child.removeFromParent()
            }
        }
    }
    
    //Set text for game label
    func displayLabel(textLabel: String){
        gameLabel?.isHidden = false
        gameLabel?.fontSize = 100
        gameLabel?.position = CGPoint(x: 0, y: 100)
        gameLabel?.text = textLabel
    }

    //start a new game
    func restartGame() {
        clearNodes()
        setUp()
    }
    
    //clear all brick nodes
    func clearNodes() {
        for child in self.children{
            if child.name == "brick"{
                child.removeFromParent()
            }
        }
    }

}
