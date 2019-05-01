//
//  CompletionView.swift
//  StudIO
//
//  Created by Arthur Guiot on 29/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class CompletionView: UIView {

    @IBOutlet var contentView: UIView!
    /*
    // Only override draw() if you perform custom drawing.
    // An empty implementation adversely affects performance during animation.
    override func draw(_ rect: CGRect) {
        // Drawing code
    }
    */
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        commonInit()
    }
    
    
    private func commonInit() {
        Bundle.main.loadNibNamed("CompletionView", owner: self, options: nil)
        
        addSubview(contentView)
        contentView.frame = self.bounds
        contentView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        
        initialisation()
        
    }
    
    @IBOutlet weak var scrollView: UIScrollView!
    
    func initialisation() {
        scrollView.contentSize = CGSize(width: scrollView.frame.size.width, height: scrollView.contentSize.height)
    }
}


extension Editor {
    @IBAction func keyTouch(_ sender: Any) {
        let button = sender as! UIButton
        let content = button.currentTitle
        
        let data = content?.data(using: .utf8)
        let c = data?.base64EncodedString()
        let js = """
        try {
        window.e.insertSnippet("\(c ?? "")")
        } catch(e) {
        console.log(e)
        }
        """
        DispatchQueue.main.async {
            self.codeView.evaluateJavaScript(js) { (result, error) in
                if error != nil {
                    NSObject.alert(t: "Key error", m: error?.localizedDescription ?? "Couldn't insert key")
                }
            }
        }
    }
}
