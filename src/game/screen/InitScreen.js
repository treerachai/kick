import * as PIXI from 'pixi.js';
import TweenLite from 'gsap';
import config  from '../../config';
import utils  from '../../utils';
import Screen from '../../screenManager/Screen'
import Ball from '../entity/Ball'

import Collisions from '../core/Collisions';
import TrailManager from '../core/TrailManager';
import ViewManager from '../core/ViewManager';
import GoalView from '../entity/GoalView';

export default class InitScreen extends Screen{	
	constructor(label){
		super(label);
	}
	build(){
		super.build();

		this.backgroundContaier = new PIXI.Container();
		this.addChild(this.backgroundContaier);

		this.background = new PIXI.Graphics();
		this.background.beginFill(0xababab);
	    this.background.drawRect( 0, 0, config.width, config.height);
		this.backgroundContaier.addChild(this.background);

		this.field = new PIXI.Graphics().beginFill(0x3C8C57).drawRect(0,0,config.width, config.height);
		this.backgroundContaier.addChild(this.field)
		this.field.y = 150;

		this.sky = new PIXI.Graphics().beginFill(0x27BBE0).drawRect(0,0,config.width, 150);
		this.backgroundContaier.addChild(this.sky)

		this.gameContainer = new PIXI.Container();
		this.addChild(this.gameContainer);

		this.updateList = [];
		this.trailPool = [];
		this.ballPool = [];
		this.currentBalls = [];


        // this.currentBalls.push(this.getBall());

        this.ingameUIContainer = new PIXI.Container();
		this.addChild(this.ingameUIContainer);

		this.backgroundIngameUI = new PIXI.Graphics().beginFill(0x023548).drawRect(0,0,config.width, config.height);
		this.backgroundIngameUI.alpha = 0;
		this.ingameUIContainer.addChild(this.backgroundIngameUI)


		this.addEvents();
		this.currentTrail = false;


		this.goleira = new GoalView(this)
		this.goleira.build();
		this.goleira.x = config.width / 2
		this.goleira.y = 150

		this.gameContainer.addChild(this.goleira)

		this.textLabel = new PIXI.Text('---',{font : '20px', fill : 0x000000, align : 'right'});
		this.addChild(this.textLabel)

		this.debug2 = new PIXI.Text('---',{font : '20px', fill : 0x000000, align : 'right'});
		this.addChild(this.debug2)
		this.debug2.y = config.height - 20;

		this.collisions = new Collisions();
		this.viewManager = new ViewManager();
		this.trailManager = new TrailManager(this.ingameUIContainer);

        // this.updateList.push(this.currentBalls)
        this.updateList.push(this.goleira)

        this.reset();
	}

	getBall(){
		for (var i = this.ballPool.length - 1; i >= 0; i--) {
			if((!this.ballPool[i].killed && !this.ballPool[i].shooting) || (this.ballPool[i].shooting && this.ballPool[i].killed)){
				console.log(this.ballPool[i].killed , this.ballPool[i].shooting);


				this.ballPool[i].reset();
				return this.ballPool[i]
			}
		}
		let ball = new Ball(this,50);
		this.ballPool.push(ball);
		ball.reset();
		this.gameContainer.addChild(ball)

		for (var i = this.updateList.length - 1; i >= 0; i--) {
			if(this.updateList[i] == ball){
				this.updateList.splice(i,1);
			}
		}
		this.updateList.push(ball)

		return ball;
	}
	getTrail(){
		for (var i = this.trailPool.length - 1; i >= 0; i--) {
			if(this.trailPool[i].killed){
				this.trailPool[i].reset(this.mousePosition);
				return this.trailPool[i]
			}
		}
		let trail = new Trail(this.ingameUIContainer, 50, PIXI.Texture.from('assets/images/rainbow-flag2.jpg'));
		trail.trailTick = 15;
		trail.speed = 0.01;
		trail.frequency = 0.0001
		this.trailPool.push(trail);
		return trail;
	}
	reset(){
		console.log('reset');
		this.paused = false;		
		this.colliding = false;
        this.currentBalls.push(this.getBall())
        
	}
	debugBall(ballPosition, entity){
		if(this.testeBall && this.testeBall.parent){
			this.testeBall.parent.removeChild(this.testeBall)
		}
		this.testeBall = new PIXI.Graphics().lineStyle(1, 0xff0000).drawCircle(ballPosition.x,ballPosition.y, entity.getRadius());
		this.addChild(this.testeBall);
	}
	collideBounds(delta, entity){
		if(entity.collided){
			return;
		}

		//if is out of bounds
		// if(entity.velocity.x > 0){
		// 		if(entity.x > config.width + entity.getRadius() * 2){
		// 			this.reset();
		// 		}
		// 	}else if(entity.velocity.x < 0){
		// 		if(entity.x < -entity.getRadius() * 2){
		// 			this.reset();
		// 			// entity.virtualVelocity.x *= -0.1;
		// 		}
		// 	}


		// if(entity.velocity.y > 0){
		// 	if(entity.y > config.height * 0.8){
		// 		// entity.velocity.y *= -0.5;
		// 		// entity.y += entity.velocity.y * delta;
		// 	}
		// }else 

		if(entity.velocity.y < 0){
			if(entity.y < this.goleira.y -10){


				// if(this.colliding){
				// 	return
				// }
				let ballPosition = {
					x: entity.x,
					y: entity.y + entity.spriteContainer.y * entity.scale.y
				}
				this.debugBall(ballPosition, entity);
				this.textLabel.text = ''//'NOT GOAL'
				let collisions = [];
				let topStickPoint = this.goleira.getTopStick();
				collisions.push(this.detectSideCollision(this.goleira.getLeftStick(), entity,ballPosition))
				collisions.push(this.detectSideCollision(this.goleira.getRightStick(), entity,ballPosition))
				collisions.push(this.detectTopCollision(topStickPoint, entity,ballPosition))

				let killStandard = false
				let isGoal = true;

				entity.stickCollide();
				for (var i = collisions.length - 1; i >= 0; i--) {
					let interception = collisions[i];
					if(interception.interception.length > 0){

						

						if(interception.type == 'side'){
							console.log('SIDE');
							let sideStick = {x:interception.interception[0].x, y:ballPosition.y + 1, getRadius:function(){return 1}}
							this.collisions.collideSticksSide(1/60, entity, sideStick, ballPosition)
						}else{
							let topStick = {x:ballPosition.x + 1, y:interception.interception[0].y, getRadius:function(){return 1}}
							// let topStick = {x:ballPosition.x + entity.getRadius() * 0.5, y:interception.interception[0].y, getRadius:function(){return 5}}
							this.collisions.collideSticks(1/60, entity, topStick, ballPosition)
						}
						
						let label =  isGoal?'GOAL':'NOT GOAL'
						//this.textLabel.text = distance +' - '+distPos+' - '+label;//interception[0].x + ' - ' +interception[0].y + ' - '+interception[1].x + ' - ' +interception[1].y//'COLIDIU'
						killStandard = true;
					}
				}



				let circle = {x:ballPosition.x,y:ballPosition.y, r:entity.getRadius() * 0.5}
				let rect = this.goleira.getGoalRect()
				this.debugGoal(rect);

				console.log(rect);

				let onGoal = this.collisions.rectCircleColliding(circle, rect);


				if(onGoal && entity.velocity.y < 0){
					entity.verticalVelocity.y += 8000 / -entity.velocity.y
					entity.velocity.y *= 0.25;
					entity.rotationInfluence.x *= 0.25;
					entity.onGoal = true;
					this.textLabel.text = 'GOAL'
				}else{
					this.textLabel.text = 'NO GOAL'

					entity.spriteGravity *= 5
					entity.velocity.y *= 0.4
					entity.rotationInfluence.x *= 0.25;
				}
				



				
				// if(!this.colliding){
					// if(killStandard){
					// 	setTimeout(function() {this.reset();}.bind(this), 2000);
					// }else{
					// 	// this.paused = true;
					// 	setTimeout(function() {this.reset();}.bind(this), 1500);
					// }
				// }
				
				this.colliding = true;
			}
		}
	}

	
	
	update(delta){
		this.trailManager.update(delta, this.mousePosition);
		if(this.paused){
			return
		}
		super.update(delta);

		for (var i = this.updateList.length - 1; i >= 0; i--) {
			if(this.updateList[i].update){
				this.updateList[i].update(delta)
			}
			this.viewManager.updateObjectScale(this.updateList[i], config.height)
		}

		this.gameContainer.children.sort(utils.depthCompare);

		this.mousePosition = renderer.plugins.interaction.pointer.global;
		// if(this.currentTrail)

		// this.collide(delta, this.currentBalls, this.currentBalls2)
		// this.collide(delta, this.currentBalls, this.currentBalls3)
		// console.log(this.currentBalls.length);
		if(this.debug2.text != this.currentBalls.length){
			this.debug2.text = this.currentBalls.length;
		}
		for (var i = this.currentBalls.length - 1; i >= 0; i--) {			
			this.verifyInterception(this.currentBalls[i]);
			this.collideBounds(delta, this.currentBalls[i])

			if(this.currentBalls[i].killed){
				this.currentBalls.splice(i, 1);
			}
		}



	}

	debugGoal(rect){
		if(this.testeRect){
			this.testeRect.parent.removeChild(this.testeRect)
		}
		this.testeRect = new PIXI.Graphics().beginFill(0x00FFFF).drawRect(rect.x,rect.y, rect.w,rect.h);
		this.addChild(this.testeRect)
		this.testeRect.alpha = 0.2
	}

	debugStick(target){
		this.testee = new PIXI.Graphics().lineStyle(2, 0xff0000).moveTo(target.p1.x,target.p1.y);
		this.testee.lineTo(target.p2.x,target.p2.y);
		this.addChild(this.testee);
	}

	verifyInterception(entity){
		if(!this.tapping || (this.firstPoint && this.firstPoint.y < this.mousePosition.y)){
			return
		}

		this.secPoint = {x:this.mousePosition.x,y:this.mousePosition.y};
		let interception = this.collisions.inteceptCircleLineSeg(entity, {p1:this.firstPoint, p2:this.secPoint});
		
		//just shoot if have two points of intersection
		if(interception.length < 2){
			return
		}
		this.tapping = false;

		//angle btx the intersection points
		let angleColision = -Math.atan2(interception[0].y - interception[1].y, interception[0].x - interception[1].x);
		angleColision += 90 / 180 * 3.14;;
		let frontBall = {x:entity.x, y:entity.y - entity.getRadius()}
		
		//angle btw front of the ball and the points
		let angle = -Math.atan2(this.firstPoint.y - frontBall.y, this.secPoint.x - frontBall.x);
		// let angle = -Math.atan2(this.firstPoint.y - this.secPoint.y, this.firstPoint.x - this.secPoint.x);
		angle += 90 / 180 * 3.14;


        let force = utils.distance(this.firstPoint.x, this.firstPoint.y, this.secPoint.x, this.secPoint.y) * 0.025

       
        entity.shoot(force, angle, angleColision);

        this.reset();

        this.paused = true;
        setTimeout(function() {this.paused = false;}.bind(this), 100);
	}
	
	detectTopCollision(target, entity,ballPosition){
		this.debugStick(target)
		return this.collisions.detectTopCollision(target, entity,ballPosition);
	}

	detectSideCollision(target, entity,ballPosition){
		this.debugStick(target)
		return this.collisions.detectSideCollision(target, entity,ballPosition);
	}
	onTapUp(){
		this.trailManager.removeTrail();
		this.tapping = false;
	}
	onTapDown(){
		// this.currentBalls.shoot(6.5 , 0,  0);
		// this.reset();
		// let tempBall = this.getBall()
		// this.currentBalls.push(tempBall)
		// //tempBall.shoot(5 + Math.random() * 0.8, 0, Math.random() * 0.03 - 0.015 + 0.34);
		// //TOP SHOOT
		// tempBall.shoot(6.5 + Math.random() * 0.8, Math.random() * 0.4 - 0.2,  Math.random() * 0.1 - 0.05);
		this.tapping = true;
		this.firstPoint = {x:this.mousePosition.x,y:this.mousePosition.y};
		this.trailManager.startNewTrail(this.mousePosition);
	}
	removeEvents(){
		this.ingameUIContainer.interactive = false;
		this.ingameUIContainer.off('touchstart').off('mousedown');
		this.ingameUIContainer.off('touchend').off('mouseup');
	}
	addEvents(){
		this.removeEvents();
		this.ingameUIContainer.interactive = true;
		this.ingameUIContainer.on('mousedown', this.onTapDown.bind(this)).on('touchstart', this.onTapDown.bind(this));
		this.ingameUIContainer.on('mouseup', this.onTapUp.bind(this)).on('touchend', this.onTapUp.bind(this));
	}
	
}
