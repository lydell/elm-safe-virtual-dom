module KitchenSink exposing (main)

import Browser
import Html exposing (Html)
import Html.Attributes
import Html.Events
import Html.Keyed
import Html.Lazy
import Markdown
import Svg
import Svg.Attributes


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , view = view
        , update = update
        }


type alias Model =
    Int


init : Model
init =
    0


type Msg
    = Next
    | Num Int


update : Msg -> Model -> Model
update msg model =
    case msg of
        Next ->
            model + 1

        Num num ->
            num


view : Model -> Html Msg
view model =
    Html.div []
        [ Html.text ("Text: " ++ String.fromInt model)
        , Html.div [ Html.Attributes.class "class" ]
            [ Html.text ("Element: " ++ String.fromInt model) ]
        , Html.Keyed.node "keygen" [] []
        , Html.Lazy.lazy viewNum (model // 2)
        , Html.map Num
            (Html.button
                [ Html.Attributes.id "num"
                , Html.Events.onClick 333
                , Html.Events.onClick 100 |> Html.Attributes.map ((+) 1)
                ]
                [ Html.text ("map: " ++ String.fromInt model) ]
            )
        , Markdown.toHtml [ Html.Attributes.id "markdown" ]
            ("_Markdown:_ " ++ String.fromInt model)
        , Svg.svg [ Svg.Attributes.xmlLang "en-US" ] []
        , Html.button
            [ Html.Attributes.id "next"
            , Html.Events.onClick Next
            , Html.Attributes.type_ "button"
            , Html.Attributes.style "outline" "1px solid red"
            , Html.Attributes.tabindex 1
            ]
            [ Html.text "Next" ]
        ]


viewNum : Int -> Html msg
viewNum n =
    Html.text ("Lazy (every other): " ++ String.fromInt n)
