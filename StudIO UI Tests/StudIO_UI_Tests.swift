//
//  StudIO_UI_Tests.swift
//  StudIO UI Tests
//
//  Created by Arthur Guiot on 30/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import XCTest

class StudIO_UI_Tests: XCTestCase {

    override func setUp() {
        // Put setup code here. This method is called before the invocation of each test method in the class.

        // In UI tests it is usually best to stop immediately when a failure occurs.
        continueAfterFailure = false

        // UI tests must launch the application that they test. Doing this in setup will make sure it happens for each test method.
        let app = XCUIApplication()
        setupSnapshot(app)
        app.launch()
        // In UI tests it’s important to set the initial state - such as interface orientation - required for your tests before they run. The setUp method is a good place to do this.
    }

    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func testExample() {
        // Use recording to get started writing UI tests.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
        
        let app = XCUIApplication()
        app.navigationBars["Projects"].buttons["Add"].tap()
        app.buttons["Clone repository"].tap()
        let gtURL = app.textFields.firstMatch
        tapElementAndWaitForKeyboardToAppear(element: gtURL)
        gtURL.typeText("https://github.com/arguiot/Neuron")
        snapshot("Git Clone")
        app.children(matching: .window).element(boundBy: 0).buttons["Done"].tap()
        sleep(12)
        app.collectionViews.cells.otherElements.containing(.image, identifier:"Repo-white").element.tap()
        app.tables/*@START_MENU_TOKEN@*/.cells.staticTexts["neuron_ml"]/*[[".cells.staticTexts[\"neuron_ml\"]",".staticTexts[\"neuron_ml\"]"],[[[-1,1],[-1,0]]],[1]]@END_MENU_TOKEN@*/.tap()
        sleep(1)
        let tablesQuery = app.tables
        tablesQuery/*@START_MENU_TOKEN@*/.cells.staticTexts["core"]/*[[".cells.staticTexts[\"core\"]",".staticTexts[\"core\"]"],[[[-1,1],[-1,0]]],[1]]@END_MENU_TOKEN@*/.tap()
        sleep(1)
        tablesQuery/*@START_MENU_TOKEN@*/.cells.staticTexts["data"]/*[[".cells.staticTexts[\"data\"]",".staticTexts[\"data\"]"],[[[-1,1],[-1,0]]],[1]]@END_MENU_TOKEN@*/.tap()
        sleep(1)
        snapshot("Menu")
        tablesQuery/*@START_MENU_TOKEN@*/.cells.staticTexts["createml.py"]/*[[".cells.staticTexts[\"createml.py\"]",".staticTexts[\"createml.py\"]"],[[[-1,1],[-1,0]]],[1]]@END_MENU_TOKEN@*/.tap()
        sleep(3)
        snapshot("CreateML")
        app.navigationBars["createml.py"].buttons["Neuron"].tap()
        tablesQuery/*@START_MENU_TOKEN@*/.cells.staticTexts["neuron_ml"]/*[[".cells.staticTexts[\"neuron_ml\"]",".staticTexts[\"neuron_ml\"]"],[[[-1,1],[-1,0]]],[1]]@END_MENU_TOKEN@*/.tap()
        
        let cancelButton = app.navigationBars["Neuron"].buttons["Cancel"]
        cancelButton.tap()
        
        let collectionViewsQuery = app.collectionViews
        let repoWhiteElement = collectionViewsQuery.cells.otherElements.containing(.image, identifier:"Repo-white").element
        
        repoWhiteElement.press(forDuration: 2)
        
        app.sheets.buttons["Delete 'Neuron'"].tap()
        snapshot("Share Sheet")
    }

}

extension XCTestCase {
    
    func tapElementAndWaitForKeyboardToAppear(element: XCUIElement) {
        let keyboard = XCUIApplication().keyboards.element
        while (true) {
            element.tap()
            if keyboard.exists {
                break;
            }
            RunLoop.current.run(until: NSDate(timeIntervalSinceNow: 0.5) as Date)
        }
    }
}
